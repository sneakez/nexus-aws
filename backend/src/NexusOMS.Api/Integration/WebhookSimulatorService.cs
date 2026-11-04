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

public sealed class WebhookSimulatorService(
    NpgsqlDataSource dataSource,
    ChannelService channels,
    OrderCreationService orders,
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
            var request = await BuildOrderRequestAsync(connectionId, payload, eventKey, cancellationToken);
            var actorId = GetSystemActorId();
            var result = await orders.CreateAsync(request, actorId, cancellationToken);
            await CompleteSuccessAsync(log.Id, cancellationToken);
            return new WebhookSimulatorResult(result.Order.Id, result.Replayed, "processed");
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
            lines);
    }

    private Guid GetSystemActorId() => Guid.TryParse(
        configuration["WebhookSimulator:SystemActorId"], out var actorId)
        && actorId != Guid.Empty
            ? actorId
            : throw new InvalidOperationException("WebhookSimulator:SystemActorId phải là UUID profile hợp lệ.");

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
        if (string.IsNullOrWhiteSpace(payload.EventId) || payload.EventId.Length > 160
            || !string.Equals(payload.EventType, "order.ready_to_ship", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(payload.ExternalOrderId)
            || payload.ExternalOrderId.Length > 120
            || payload.WarehouseId == Guid.Empty
            || payload.Items is null || payload.Items.Count is 0)
            throw new ArgumentException("Payload webhook thiếu trường bắt buộc hoặc eventType không được hỗ trợ.");
    }

    private sealed record WebhookLog(Guid Id, string Status);
    private sealed record RetryLog(Guid Id, Guid ConnectionId, string RawBody, string EventKey);
}
