using Npgsql;
using NpgsqlTypes;
using NexusOMS.Contracts;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresOrderCreationRepository(
    NpgsqlDataSource dataSource,
    IOrderRepository orders,
    IInventoryContract inventory) : IOrderCreationRepository
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
    Guid? customerId,
    PreparedOrder prepared,
    CancellationToken cancellationToken)
    {
        const string sql = """
        insert into public.orders (
            id, customer_id, channel_connection_id, assigned_warehouse_id,
            order_number, status,
            subtotal, tax, shipping_fee, total,
            idempotency_key, creation_request)
        values (
            @id, @customerId, @channelConnectionId, @warehouseId,
            @orderNumber, 'pending',
            @subtotal, @tax, @shippingFee, @total,
            @key, @payload)
        returning subtotal, total
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("id", orderId);

        command.Parameters.Add(
            "customerId", NpgsqlDbType.Uuid).Value =
            (object?)customerId ?? DBNull.Value;
        command.Parameters.Add(
            "channelConnectionId", NpgsqlDbType.Uuid).Value =
            (object?)request.ChannelConnectionId ?? DBNull.Value;

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

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)
            || reader.GetDecimal(0) != prepared.Subtotal
            || reader.GetDecimal(1) != prepared.Total)
        {
            throw new InvalidOperationException("Database did not preserve the order amount.");
        }
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
        returning line_total
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

            if (await command.ExecuteScalarAsync(cancellationToken) is not decimal storedTotal
                || storedTotal != item.LineTotal)
            {
                throw new InvalidOperationException("Database did not preserve the line amount.");
            }
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
    private static async Task ValidateReferencesAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction,
        CreateOrderRequest request, CancellationToken cancellationToken)
    {
        // Reference locks prevent deletion while inserting the referencing order.
        await using (var warehouse = new NpgsqlCommand(
            "select id from public.warehouses where id = @id and is_active for share", connection, transaction))
        {
            warehouse.Parameters.AddWithValue("id", request.WarehouseId);
            if (await warehouse.ExecuteScalarAsync(cancellationToken) is null)
                throw new ArgumentException("Kho không tồn tại hoặc đã ngừng hoạt động.");
        }
        if (request.CustomerId is { } customerId)
        {
            await using var customer = new NpgsqlCommand(
                "select id from public.customers where id = @id for key share", connection, transaction);
            customer.Parameters.AddWithValue("id", customerId);
            if (await customer.ExecuteScalarAsync(cancellationToken) is null)
                throw new ArgumentException("Khách hàng không tồn tại.");
        }
    }

    private static async Task<Guid> InsertCustomerAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        CreateOrderCustomerRequest customer,
        CancellationToken cancellationToken)
    {
        const string sql = """
            insert into public.customers (name, phone, email)
            values (@name, @phone, @email)
            returning id
            """;

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("name", customer.Name!);
        command.Parameters.AddWithValue("phone", NpgsqlDbType.Text, (object?)customer.Phone ?? DBNull.Value);
        command.Parameters.AddWithValue("email", NpgsqlDbType.Text, (object?)customer.Email ?? DBNull.Value);

        return (Guid)(await command.ExecuteScalarAsync(cancellationToken)
            ?? throw new InvalidOperationException("Không thể tạo khách hàng cho đơn."));
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
                    var customerId = request.CustomerId;
                    if (request.NewCustomer is not null)
                        customerId = await InsertCustomerAsync(connection, transaction, request.NewCustomer, cancellationToken);

                    var orderRequest = request with { CustomerId = customerId, NewCustomer = null };
                    await ValidateReferencesAsync(connection, transaction, orderRequest, cancellationToken);

                    await InsertOrderAsync(
                        connection, transaction, orderId,
                        request, customerId, prepared, cancellationToken);

                    await InsertItemsAsync(
                        connection, transaction, orderId,
                        prepared, cancellationToken);

                    var context = new InventoryTransactionContext(transaction);
                    foreach (var item in prepared.Items.OrderBy(item => item.ProductId))
                    {
                        var reservation = await inventory.ReserveAsync(
                            new InventoryReservationRequest(item.ProductId, request.WarehouseId,
                                item.Quantity, $"reserve:{orderId:N}:{item.ProductId:N}", orderId),
                            context, cancellationToken);
                        if (reservation.ReservedQuantity != item.Quantity)
                            throw new InvalidOperationException("Số lượng giữ tồn không khớp số lượng đặt.");
                    }

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
                catch (PostgresException exception) when (
                    exception.SqlState == PostgresErrorCodes.ForeignKeyViolation
                    && exception.ConstraintName is "orders_customer_id_fkey" or "orders_assigned_warehouse_id_fkey"
                        or "order_items_product_id_fkey")
                {
                    throw new ArgumentException("Khách hàng, kho hoặc sản phẩm không còn tồn tại.", exception);
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
