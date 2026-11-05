using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using NexusOMS.Api.Infrastructure;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Integration;

public sealed record WebhookSimulatorItem(string? ChannelSku, decimal Quantity, decimal UnitPrice);

public sealed record WebhookSimulatorPayload(
    string? EventId,
    string? EventType,
    string? ExternalOrderId,
    Guid WarehouseId,
    decimal Tax,
    decimal ShippingFee,
    IReadOnlyList<WebhookSimulatorItem>? Items);

public sealed record WebhookSimulatorResult(Guid OrderId, bool Replayed, string Status);

public sealed class WebhookSignatureException : Exception;
public sealed class WebhookPayloadConflictException : Exception;
public sealed class WebhookInventoryUnavailableException(string message) : Exception(message);

public sealed class WebhookSimulatorService(
    NpgsqlDataSource dataSource,
    ChannelService channels,
    OrderCreationService orders,
    OrderProgressService progress,
    OrderShippingService shipping,
    IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<WebhookSimulatorResult> ProcessAsync(
        Guid connectionId,
        string rawBody,
        string? signature,
        CancellationToken cancellationToken = default)
    {
        var secret = configuration["WebhookSimulator:Secret"];
        if (!WebhookSignatureVerifier.IsValid(rawBody, signature, secret ?? string.Empty))
            throw new WebhookSignatureException();

        var payload = JsonSerializer.Deserialize<WebhookSimulatorPayload>(rawBody, JsonOptions)
            ?? throw new ArgumentException("Payload webhook không hợp lệ.");
        Validate(payload);

        var eventKey = $"webhook:{connectionId:N}:{payload.EventId!.Trim()}";
        var log = await BeginLogAsync(connectionId, payload.EventType!, eventKey, rawBody, cancellationToken);
        return await ProcessLogAsync(log, connectionId, payload, eventKey, cancellationToken);
    }

    public async Task<WebhookSimulatorResult> ProcessTrustedAsync(
        Guid connectionId,
        WebhookSimulatorPayload payload,
        CancellationToken cancellationToken = default)
    {
        Validate(payload);
        var rawBody = JsonSerializer.Serialize(payload, JsonOptions);
        var eventKey = $"webhook:{connectionId:N}:{payload.EventId!.Trim()}";
        var log = await BeginLogAsync(connectionId, payload.EventType!, eventKey, rawBody, cancellationToken);
        return await ProcessLogAsync(log, connectionId, payload, eventKey, cancellationToken);
    }

    public async Task RetryDueAsync(CancellationToken cancellationToken = default)
    {
        var maxAttempts = RetryMaxAttempts;
        var batchSize = Math.Clamp(configuration.GetValue("WebhookSimulator:RetryBatchSize", 20), 1, 100);
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        const string claim = """
            with due as (
                select id from public.webhook_delivery_logs
                where status = 'failed' and retryable and retry_count < @maxAttempts
                  and next_retry_at <= now()
                order by next_retry_at, received_at
                for update skip locked
                limit @batchSize
            )
            update public.webhook_delivery_logs log
            set status = 'processing'
            from due
            where log.id = due.id
            returning log.id, log.channel_connection_id, log.payload::text, log.idempotency_key
            """;
        await using var command = new NpgsqlCommand(claim, connection);
        command.Parameters.AddWithValue("maxAttempts", maxAttempts);
        command.Parameters.AddWithValue("batchSize", batchSize);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var due = new List<RetryLog>();
        while (await reader.ReadAsync(cancellationToken))
            due.Add(new RetryLog(reader.GetGuid(0), reader.GetGuid(1), reader.GetString(2), reader.GetString(3)));

        foreach (var log in due)
        {
            try
            {
                var payload = JsonSerializer.Deserialize<WebhookSimulatorPayload>(log.RawBody, JsonOptions)
                    ?? throw new ArgumentException("Payload webhook không hợp lệ.");
                Validate(payload);
                try
                {
                    await ProcessLogAsync(new WebhookLog(log.Id, "processing"), log.ConnectionId, payload, log.EventKey, cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
                catch { /* ProcessLogAsync already records its failure. */ }
            }
            catch (Exception exception)
            {
                await CompleteFailureAsync(log.Id, exception, cancellationToken);
            }
        }
    }

    private async Task<WebhookSimulatorResult> ProcessLogAsync(
        WebhookLog log,
        Guid connectionId,
        WebhookSimulatorPayload payload,
        string eventKey,
        CancellationToken cancellationToken)
    {
        try
        {
            await EnsureConnectionAsync(connectionId, cancellationToken);
            var actorId = GetSystemActorId();
            var eventType = payload.EventType!.Trim().ToLowerInvariant();
            WebhookSimulatorResult result;
            if (eventType is "order.created" or "order.ready_to_ship")
            {
                var request = await BuildOrderRequestAsync(connectionId, payload, eventKey, cancellationToken);
                await EnsureInventoryAvailableAsync(request, cancellationToken);
                var created = await orders.CreateAsync(request, actorId, cancellationToken);
                result = new WebhookSimulatorResult(created.Order.Id, created.Replayed, "pending");
            }
            else
            {
                var orderId = await FindOrderIdAsync(connectionId, payload.ExternalOrderId!, cancellationToken)
                    ?? throw new ArgumentException("Không tìm thấy đơn sàn tương ứng để cập nhật trạng thái.");
                result = eventType switch
                {
                    "order.confirmed" => await AdvanceAsync(orderId, "confirm", eventKey, actorId, cancellationToken),
                    "order.processing" => await AdvanceAsync(orderId, "process", eventKey, actorId, cancellationToken),
                    "order.shipped" => await ShipAsync(orderId, eventKey, actorId, cancellationToken),
                    "order.delivered" => await MarkDeliveredAsync(orderId, eventKey, actorId, cancellationToken),
                    _ => throw new ArgumentException("eventType không được hỗ trợ."),
                };
            }
            await CompleteSuccessAsync(log.Id, cancellationToken);
            return result;
        }
        catch (Exception exception)
        {
            await CompleteFailureAsync(log.Id, exception, cancellationToken);
            throw;
        }
    }

    private async Task EnsureConnectionAsync(Guid connectionId, CancellationToken cancellationToken)
    {
        var connection = await channels.GetConnectionAsync(connectionId, cancellationToken)
            ?? throw new ArgumentException("Channel connection không tồn tại.");
        if (!string.Equals(connection.Status, "connected", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Channel connection không ở trạng thái connected.");
    }

    private async Task<CreateOrderRequest> BuildOrderRequestAsync(
        Guid connectionId,
        WebhookSimulatorPayload payload,
        string eventKey,
        CancellationToken cancellationToken)
    {
        var mappings = await channels.ListMappingsAsync(connectionId, cancellationToken);
        var bySku = mappings.ToDictionary(mapping => mapping.ChannelSku, StringComparer.OrdinalIgnoreCase);
        var lines = new List<CreateOrderLineRequest>();

        foreach (var item in payload.Items!)
        {
            var sku = item.ChannelSku?.Trim().ToUpperInvariant() ?? string.Empty;
            if (!bySku.TryGetValue(sku, out var mapping))
                throw new ArgumentException($"Không có SKU mapping cho '{sku}'.");
            lines.Add(new CreateOrderLineRequest(mapping.ProductId, item.Quantity, item.UnitPrice));
        }

        if (lines.GroupBy(line => line.ProductId).Any(group => group.Count() > 1))
            throw new ArgumentException("Webhook v1 chưa hỗ trợ nhiều line cùng một Product.");

        return new CreateOrderRequest(
            eventKey,
            payload.ExternalOrderId!.Trim(),
            null,
            payload.WarehouseId,
            payload.Tax,
            payload.ShippingFee,
            lines,
            connectionId);
    }

    // This pre-flight check gives the simulator a useful message. The inventory contract still
    // enforces the same condition transactionally when it actually reserves stock.
    private async Task EnsureInventoryAvailableAsync(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        foreach (var line in request.Items)
        {
            await using var command = dataSource.CreateCommand("""
                select p.sku, p.name, coalesce(i.stock - i.reserved, 0)
                from public.products p
                left join public.inventory_items i on i.product_id = p.id and i.warehouse_id = @warehouseId
                where p.id = @productId
                """);
            command.Parameters.AddWithValue("warehouseId", request.WarehouseId);
            command.Parameters.AddWithValue("productId", line.ProductId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                throw new WebhookInventoryUnavailableException("Sản phẩm ánh xạ không còn tồn tại.");
            var sku = reader.GetString(0);
            var name = reader.GetString(1);
            var available = reader.GetDecimal(2);
            if (available < line.Quantity)
                throw new WebhookInventoryUnavailableException($"'{sku} · {name}' cần {line.Quantity:0.###} nhưng kho chỉ còn {available:0.###} khả dụng.");
        }
    }

    private Guid GetSystemActorId() => Guid.TryParse(
        configuration["WebhookSimulator:SystemActorId"], out var actorId)
        && actorId != Guid.Empty
            ? actorId
            : throw new InvalidOperationException("WebhookSimulator:SystemActorId phải là UUID profile hợp lệ.");

    private async Task<Guid?> FindOrderIdAsync(Guid connectionId, string externalOrderId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select id from public.orders
            where channel_connection_id = @connectionId and order_number = @orderNumber
            limit 1
            """);
        command.Parameters.AddWithValue("connectionId", connectionId);
        command.Parameters.AddWithValue("orderNumber", externalOrderId.Trim());
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return value is Guid id ? id : null;
    }

    private async Task<WebhookSimulatorResult> AdvanceAsync(Guid orderId, string operation, string eventKey, Guid actorId, CancellationToken cancellationToken)
    {
        var result = await progress.AdvanceAsync(orderId, operation, new OrderProgressRequest(eventKey), actorId, cancellationToken)
            ?? throw new ArgumentException("Đơn hàng không tồn tại.");
        return new WebhookSimulatorResult(result.OrderId, result.Replayed, result.Status);
    }

    private async Task<WebhookSimulatorResult> ShipAsync(Guid orderId, string eventKey, Guid actorId, CancellationToken cancellationToken)
    {
        var result = await shipping.ShipAsync(orderId, new ShipOrderRequest(eventKey), actorId, cancellationToken)
            ?? throw new ArgumentException("Đơn hàng không tồn tại.");
        return new WebhookSimulatorResult(result.OrderId, result.Replayed, result.Status);
    }

    private async Task<WebhookSimulatorResult> MarkDeliveredAsync(Guid orderId, string eventKey, Guid actorId, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using (var lockCommand = new NpgsqlCommand("select pg_advisory_xact_lock(hashtextextended(@key, 0))", connection, transaction))
        {
            lockCommand.Parameters.AddWithValue("key", $"order-operation:{eventKey}");
            await lockCommand.ExecuteNonQueryAsync(cancellationToken);
        }
        string? previous;
        await using (var read = new NpgsqlCommand("select status::text from public.orders where id = @id for update", connection, transaction))
        {
            read.Parameters.AddWithValue("id", orderId);
            previous = await read.ExecuteScalarAsync(cancellationToken) as string;
        }
        if (previous is null) throw new ArgumentException("Đơn hàng không tồn tại.");
        if (previous == "delivered") { await transaction.CommitAsync(cancellationToken); return new WebhookSimulatorResult(orderId, true, "delivered"); }
        if (previous != "shipped") throw new OrderTransitionConflictException($"Không thể giao thành công đơn ở trạng thái '{previous}'.");
        await using (var update = new NpgsqlCommand("""
            update public.orders set status = 'delivered', updated_at = now() where id = @id;
            insert into public.order_status_log(order_id, from_status, to_status, note, created_by)
                values (@id, @previous::public.order_status, 'delivered', 'Webhook báo giao thành công', @actor);
            insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
                values (@actor, 'order.delivered', 'orders', @id, jsonb_build_object('fromStatus', @previous::text, 'toStatus', 'delivered'));
            """, connection, transaction))
        {
            update.Parameters.AddWithValue("id", orderId); update.Parameters.AddWithValue("previous", previous); update.Parameters.AddWithValue("actor", actorId);
            await update.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        return new WebhookSimulatorResult(orderId, false, "delivered");
    }

    private async Task<WebhookLog> BeginLogAsync(
        Guid connectionId,
        string eventType,
        string key,
        string rawBody,
        CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        const string insert = """
            insert into public.webhook_delivery_logs (channel_connection_id, event_type, idempotency_key, payload, status)
            values (@connectionId, @eventType, @key, @payload, 'received')
            on conflict (idempotency_key) where idempotency_key is not null do nothing
            """;
        await using (var command = new NpgsqlCommand(insert, connection))
        {
            command.Parameters.AddWithValue("connectionId", connectionId);
            command.Parameters.AddWithValue("eventType", eventType);
            command.Parameters.AddWithValue("key", key);
            command.Parameters.Add("payload", NpgsqlDbType.Jsonb).Value = rawBody;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        const string read = """
            select id, payload = @payload::jsonb, status
            from public.webhook_delivery_logs where idempotency_key = @key
            """;
        await using var readCommand = new NpgsqlCommand(read, connection);
        readCommand.Parameters.AddWithValue("key", key);
        readCommand.Parameters.Add("payload", NpgsqlDbType.Jsonb).Value = rawBody;
        await using var reader = await readCommand.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new InvalidOperationException("Không thể tạo webhook log.");
        if (!reader.GetBoolean(1))
            throw new WebhookPayloadConflictException();
        return new WebhookLog(reader.GetGuid(0), reader.GetString(2));
    }

    private async Task CompleteSuccessAsync(Guid id, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            update public.webhook_delivery_logs
            set status = 'processed', error_message = null, retryable = false,
                next_retry_at = null, processed_at = now()
            where id = @id
            """);
        command.Parameters.AddWithValue("id", id);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task CompleteFailureAsync(Guid id, Exception exception, CancellationToken cancellationToken)
    {
        var retryable = IsRetryable(exception);
        var nextRetryAt = DateTimeOffset.UtcNow.AddSeconds(Math.Max(5, configuration.GetValue("WebhookSimulator:RetryDelaySeconds", 30)));
        await using var command = dataSource.CreateCommand("""
            update public.webhook_delivery_logs
            set status = 'failed', error_message = @error,
                retry_count = retry_count + 1,
                retryable = @retryable and retry_count + 1 < @maxAttempts,
                next_retry_at = case when @retryable and retry_count + 1 < @maxAttempts then @nextRetryAt else null end,
                processed_at = null
            where id = @id
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("error", exception.Message);
        command.Parameters.AddWithValue("retryable", retryable);
        command.Parameters.AddWithValue("maxAttempts", RetryMaxAttempts);
        command.Parameters.AddWithValue("nextRetryAt", nextRetryAt);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private int RetryMaxAttempts => Math.Clamp(configuration.GetValue("WebhookSimulator:RetryMaxAttempts", 3), 1, 10);

    private static bool IsRetryable(Exception exception) => exception is NpgsqlException or TimeoutException or HttpRequestException;

    private static void Validate(WebhookSimulatorPayload payload)
    {
        var eventType = payload.EventType?.Trim().ToLowerInvariant();
        var supported = eventType is "order.created" or "order.ready_to_ship" or "order.confirmed" or "order.processing" or "order.shipped" or "order.delivered";
        var createsOrder = eventType is "order.created" or "order.ready_to_ship";
        if (string.IsNullOrWhiteSpace(payload.EventId) || payload.EventId.Length > 160
            || !supported || string.IsNullOrWhiteSpace(payload.ExternalOrderId) || payload.ExternalOrderId.Length > 120
            || (createsOrder && (payload.WarehouseId == Guid.Empty || payload.Items is null || payload.Items.Count is 0)))
            throw new ArgumentException("Payload webhook thiếu trường bắt buộc hoặc eventType không được hỗ trợ.");
    }

    private sealed record WebhookLog(Guid Id, string Status);
    private sealed record RetryLog(Guid Id, Guid ConnectionId, string RawBody, string EventKey);
}
