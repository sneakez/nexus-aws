using Npgsql;
using NpgsqlTypes;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresOrderCreationRepository(
    NpgsqlDataSource dataSource,
    IOrderRepository orders) : IOrderCreationRepository
{
    public async Task<CreateOrderResult?> FindReplayAsync(
    CreateOrderRequest request,
    CancellationToken cancellationToken = default)
    {
        Guid? orderId;

        await using (var connection =
            await dataSource.OpenConnectionAsync(cancellationToken))
        {
            orderId = await FindMatchingOrderIdAsync(
                connection, null, request, cancellationToken);
        }

        if (!orderId.HasValue)
            return null;

        var order = await orders.GetAsync(
            orderId.Value, cancellationToken)
            ?? throw new InvalidOperationException(
                "Không đọc được đơn hàng đã tạo.");

        return new CreateOrderResult(order, true);
    }
    private static async Task InsertOrderAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    Guid orderId,
    CreateOrderRequest request,
    PreparedOrder prepared,
    CancellationToken cancellationToken)
    {
        const string sql = """
        insert into public.orders (
            id, customer_id, assigned_warehouse_id,
            order_number, status,
            subtotal, tax, shipping_fee, total,
            idempotency_key, creation_request)
        values (
            @id, @customerId, @warehouseId,
            @orderNumber, 'pending',
            @subtotal, @tax, @shippingFee, @total,
            @key, @payload)
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("id", orderId);

        command.Parameters.Add(
            "customerId", NpgsqlDbType.Uuid).Value =
            (object?)request.CustomerId ?? DBNull.Value;

        command.Parameters.AddWithValue(
            "warehouseId", request.WarehouseId);
        command.Parameters.AddWithValue(
            "orderNumber", request.OrderNumber);
        command.Parameters.AddWithValue("subtotal", prepared.Subtotal);
        command.Parameters.AddWithValue("tax", prepared.Tax);
        command.Parameters.AddWithValue("shippingFee", prepared.ShippingFee);
        command.Parameters.AddWithValue("total", prepared.Total);
        command.Parameters.AddWithValue("key", request.IdempotencyKey);

        command.Parameters.Add(
            "payload", NpgsqlDbType.Jsonb).Value =
            OrderCreationPayload.Serialize(request);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    private static async Task InsertItemsAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    Guid orderId,
    PreparedOrder prepared,
    CancellationToken cancellationToken)
    {
        const string sql = """
        insert into public.order_items (
            order_id, product_id, product_sku, product_name,
            quantity, unit_price, unit_cost, line_total)
        values (
            @orderId, @productId, @sku, @name,
            @quantity, @unitPrice, @unitCost, @lineTotal)
        """;

        foreach (var item in prepared.Items)
        {
            await using var command =
                new NpgsqlCommand(sql, connection, transaction);

            command.Parameters.AddWithValue("orderId", orderId);
            command.Parameters.AddWithValue("productId", item.ProductId);
            command.Parameters.AddWithValue("sku", item.ProductSku);
            command.Parameters.AddWithValue("name", item.ProductName);
            command.Parameters.AddWithValue("quantity", item.Quantity);
            command.Parameters.AddWithValue("unitPrice", item.UnitPrice);
            command.Parameters.AddWithValue("unitCost", item.UnitCost);
            command.Parameters.AddWithValue("lineTotal", item.LineTotal);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }
    private static async Task InsertHistoryAndAuditAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    Guid orderId,
    Guid actorId,
    CancellationToken cancellationToken)
    {
        const string sql = """
        insert into public.order_status_log (
            order_id, from_status, to_status, note, created_by)
        values (
            @orderId, null, 'pending', 'Tạo đơn hàng', @actorId);

        insert into public.audit_logs (
            actor_id, action, entity_type, entity_id, metadata)
        values (
            @actorId, 'order.created', 'orders', @orderId,
            jsonb_build_object('status', 'pending'));
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("orderId", orderId);
        command.Parameters.AddWithValue("actorId", actorId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    private static async Task LockRequestAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    string idempotencyKey,
    CancellationToken cancellationToken)
    {
        const string sql = """
        select pg_advisory_xact_lock(
            hashtextextended(@key, 0));
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue(
            "key", $"order-create:{idempotencyKey}");

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    private static async Task<Guid?> FindMatchingOrderIdAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction? transaction,
    CreateOrderRequest request,
    CancellationToken cancellationToken)
    {
        const string sql = """
        select id,
               coalesce(creation_request = @payload::jsonb, false)
        from public.orders
        where idempotency_key = @key
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue(
            "key", request.IdempotencyKey);

        command.Parameters.Add(
            "payload", NpgsqlDbType.Jsonb).Value =
            OrderCreationPayload.Serialize(request);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        if (!reader.GetBoolean(1))
            throw new OrderCreationConflictException(
                "Khóa chống trùng đã được dùng với nội dung khác.");

        return reader.GetGuid(0);
    }
    public async Task<CreateOrderResult> CreateAsync(
    CreateOrderRequest request,
    PreparedOrder prepared,
    Guid actorId,
    CancellationToken cancellationToken = default)
    {
        Guid orderId;
        bool replayed;

        await using (var connection =
            await dataSource.OpenConnectionAsync(cancellationToken))
        {
            await using var transaction =
                await connection.BeginTransactionAsync(cancellationToken);

            await LockRequestAsync(
                connection,
                transaction,
                request.IdempotencyKey,
                cancellationToken);

            var existingId = await FindMatchingOrderIdAsync(
                connection, transaction, request, cancellationToken);

            replayed = existingId.HasValue;
            orderId = existingId ?? Guid.NewGuid();

            if (!replayed)
            {
                try
                {
                    await InsertOrderAsync(
                        connection, transaction, orderId,
                        request, prepared, cancellationToken);

                    await InsertItemsAsync(
                        connection, transaction, orderId,
                        prepared, cancellationToken);

                    await InsertHistoryAndAuditAsync(
                        connection, transaction, orderId,
                        actorId, cancellationToken);
                }
                catch (PostgresException exception) when (
                    exception.SqlState == PostgresErrorCodes.UniqueViolation
                    && exception.ConstraintName == "orders_order_number_key")
                {
                    throw new OrderCreationConflictException(
                        "Mã đơn hàng đã tồn tại.");
                }
            }

            await transaction.CommitAsync(cancellationToken);
        }

        var order = await orders.GetAsync(orderId, cancellationToken)
            ?? throw new InvalidOperationException(
                "Không đọc được đơn hàng sau khi lưu.");

        return new CreateOrderResult(order, replayed);
    }
}
