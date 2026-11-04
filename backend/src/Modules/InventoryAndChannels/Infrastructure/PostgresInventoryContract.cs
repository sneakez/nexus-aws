using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using NexusOMS.Contracts;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresInventoryContract : IInventoryContract
{
    public async Task<InventoryReservationResult> ReserveAsync(InventoryReservationRequest request, InventoryTransactionContext context, CancellationToken cancellationToken = default)
    {
        InventoryOperationRequestValidator.Validate(request);
        var (connection, transaction) = DatabaseContext(context);
        var payload = JsonSerializer.Serialize(request);
        await LockAsync(connection, transaction, request.IdempotencyKey, cancellationToken);
        var replay = await FindReceiptAsync(connection, transaction, "reserve", request.IdempotencyKey, payload, cancellationToken);
        if (replay is not null)
            return new InventoryReservationResult(replay.StockTransactionId ?? throw new InvalidOperationException("Receipt reserve thiếu transaction."), request.Quantity);

        const string reserveSql = """
            update public.inventory_items set reserved = reserved + @quantity, updated_at = now()
            where warehouse_id = @warehouseId and product_id = @productId and stock - reserved >= @quantity
            returning id
            """;
        await using (var command = new NpgsqlCommand(reserveSql, connection, transaction))
        {
            command.Parameters.AddWithValue("warehouseId", request.WarehouseId);
            command.Parameters.AddWithValue("productId", request.ProductId);
            command.Parameters.AddWithValue("quantity", request.Quantity);
            if (await command.ExecuteScalarAsync(cancellationToken) is null) throw new InsufficientStockException();
        }

        const string reservationSql = """
            insert into public.inventory_reservations (order_id, warehouse_id, product_id, reserved_quantity, remaining_quantity, state)
            values (@orderId, @warehouseId, @productId, @quantity, @quantity, 'reserved')
            """;
        try
        {
            await using var command = new NpgsqlCommand(reservationSql, connection, transaction);
            command.Parameters.AddWithValue("orderId", request.OrderId);
            command.Parameters.AddWithValue("warehouseId", request.WarehouseId);
            command.Parameters.AddWithValue("productId", request.ProductId);
            command.Parameters.AddWithValue("quantity", request.Quantity);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new InventoryOperationConflictException("Đơn đã có giữ tồn cho sản phẩm và kho này.");
        }

        var transactionId = await InsertStockTransactionAsync(connection, transaction, request.WarehouseId, request.ProductId,
            "reserve", request.Quantity, request.OrderId, request.IdempotencyKey, cancellationToken);
        await InsertReceiptAsync(connection, transaction, "reserve", request.IdempotencyKey, payload, transactionId, cancellationToken);
        return new InventoryReservationResult(transactionId, request.Quantity);
    }

    public async Task ReleaseAsync(InventoryReleaseRequest request, InventoryTransactionContext context, CancellationToken cancellationToken = default)
    {
        InventoryOperationRequestValidator.Validate(request);
        var (connection, transaction) = DatabaseContext(context);
        var payload = JsonSerializer.Serialize(request);
        await LockAsync(connection, transaction, request.IdempotencyKey, cancellationToken);
        if (await FindReceiptAsync(connection, transaction, "release", request.IdempotencyKey, payload, cancellationToken) is not null) return;
        await ResolveOrderReservationsAsync(connection, transaction, request.OrderId, request.IdempotencyKey, "release", "released", cancellationToken);
        await InsertReceiptAsync(connection, transaction, "release", request.IdempotencyKey, payload, null, cancellationToken);
    }

    public async Task CommitOutboundAsync(InventoryCommitRequest request, InventoryTransactionContext context, CancellationToken cancellationToken = default)
    {
        InventoryOperationRequestValidator.Validate(request);
        var (connection, transaction) = DatabaseContext(context);
        var payload = JsonSerializer.Serialize(request);
        await LockAsync(connection, transaction, request.IdempotencyKey, cancellationToken);
        if (await FindReceiptAsync(connection, transaction, "outbound", request.IdempotencyKey, payload, cancellationToken) is not null) return;
        await ResolveOrderReservationsAsync(connection, transaction, request.OrderId, request.IdempotencyKey, "outbound", "committed", cancellationToken);
        await InsertReceiptAsync(connection, transaction, "outbound", request.IdempotencyKey, payload, null, cancellationToken);
    }

    public async Task ReturnInboundAsync(InventoryReturnRequest request, InventoryTransactionContext context, CancellationToken cancellationToken = default)
    {
        InventoryOperationRequestValidator.Validate(request);
        var (connection, transaction) = DatabaseContext(context);
        var payload = JsonSerializer.Serialize(request);
        await LockAsync(connection, transaction, request.IdempotencyKey, cancellationToken);
        if (await FindReceiptAsync(connection, transaction, "return_inbound", request.IdempotencyKey, payload, cancellationToken) is not null) return;

        const string reservationSql = """
            select exists (select 1 from public.inventory_reservations where order_id = @orderId
              and warehouse_id = @warehouseId and product_id = @productId and state = 'committed')
            """;
        await using (var command = new NpgsqlCommand(reservationSql, connection, transaction))
        {
            command.Parameters.AddWithValue("orderId", request.OrderId);
            command.Parameters.AddWithValue("warehouseId", request.WarehouseId);
            command.Parameters.AddWithValue("productId", request.ProductId);
            if (await command.ExecuteScalarAsync(cancellationToken) is not true)
                throw new InventoryReservationNotFoundException("Không tìm thấy dòng tồn đã xuất của đơn hàng.");
        }

        const string returnSql = """
            insert into public.inventory_items (warehouse_id, product_id, stock)
            values (@warehouseId, @productId, @quantity)
            on conflict (warehouse_id, product_id) do update
            set stock = public.inventory_items.stock + excluded.stock, updated_at = now()
            """;
        await using (var command = new NpgsqlCommand(returnSql, connection, transaction))
        {
            command.Parameters.AddWithValue("warehouseId", request.WarehouseId);
            command.Parameters.AddWithValue("productId", request.ProductId);
            command.Parameters.AddWithValue("quantity", request.Quantity);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        var transactionId = await InsertStockTransactionAsync(connection, transaction, request.WarehouseId, request.ProductId,
            "return_in", request.Quantity, request.OrderId, request.IdempotencyKey, cancellationToken);
        await InsertReceiptAsync(connection, transaction, "return_inbound", request.IdempotencyKey, payload, transactionId, cancellationToken);
    }

    private static async Task ResolveOrderReservationsAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid orderId, string operationKey, string operation, string state, CancellationToken cancellationToken)
    {
        var reservations = await ReadReservationsAsync(connection, transaction, orderId, cancellationToken);
        foreach (var reservation in reservations)
        {
            var updateSql = operation == "release"
                ? "update public.inventory_items set reserved = reserved - @quantity, updated_at = now() where warehouse_id = @warehouseId and product_id = @productId and reserved >= @quantity"
                : "update public.inventory_items set stock = stock - @quantity, reserved = reserved - @quantity, updated_at = now() where warehouse_id = @warehouseId and product_id = @productId and stock >= @quantity and reserved >= @quantity";
            await using (var command = new NpgsqlCommand(updateSql, connection, transaction))
            {
                command.Parameters.AddWithValue("warehouseId", reservation.WarehouseId);
                command.Parameters.AddWithValue("productId", reservation.ProductId);
                command.Parameters.AddWithValue("quantity", reservation.Quantity);
                if (await command.ExecuteNonQueryAsync(cancellationToken) != 1) throw new InsufficientStockException();
            }
            await using (var command = new NpgsqlCommand("update public.inventory_reservations set remaining_quantity = 0, state = @state, resolved_at = now() where order_id = @orderId and warehouse_id = @warehouseId and product_id = @productId", connection, transaction))
            {
                command.Parameters.AddWithValue("orderId", orderId);
                command.Parameters.AddWithValue("warehouseId", reservation.WarehouseId);
                command.Parameters.AddWithValue("productId", reservation.ProductId);
                command.Parameters.AddWithValue("state", state);
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            await InsertStockTransactionAsync(connection, transaction, reservation.WarehouseId, reservation.ProductId,
                operation, -reservation.Quantity, orderId, $"{operationKey}:{reservation.ProductId}", cancellationToken);
        }
    }

    private static async Task<IReadOnlyList<Reservation>> ReadReservationsAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid orderId, CancellationToken cancellationToken)
    {
        const string sql = "select warehouse_id, product_id, remaining_quantity from public.inventory_reservations where order_id = @orderId and state = 'reserved' order by product_id for update";
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("orderId", orderId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var reservations = new List<Reservation>();
        while (await reader.ReadAsync(cancellationToken)) reservations.Add(new(reader.GetGuid(0), reader.GetGuid(1), reader.GetDecimal(2)));
        if (reservations.Count == 0) throw new InventoryReservationNotFoundException("Đơn hàng không còn tồn giữ để xử lý.");
        return reservations;
    }

    private static (NpgsqlConnection Connection, NpgsqlTransaction Transaction) DatabaseContext(InventoryTransactionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        return (context.Connection as NpgsqlConnection ?? throw new ArgumentException("Inventory cần PostgreSQL connection."),
            context.Transaction as NpgsqlTransaction ?? throw new ArgumentException("Inventory cần PostgreSQL transaction."));
    }

    private static async Task LockAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string key, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("select pg_advisory_xact_lock(hashtextextended(@key, 0));", connection, transaction);
        command.Parameters.AddWithValue("key", $"inventory-operation:{key}");
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<Receipt?> FindReceiptAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string operation, string key, string payload, CancellationToken cancellationToken)
    {
        const string sql = "select operation, payload = @payload::jsonb, stock_transaction_id from public.inventory_operation_receipts where idempotency_key = @key";
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("key", key);
        command.Parameters.Add("payload", NpgsqlDbType.Jsonb).Value = payload;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        if (reader.GetString(0) != operation || !reader.GetBoolean(1)) throw new InventoryOperationConflictException("Khóa chống trùng đã được dùng với nội dung khác.");
        return new Receipt(reader.IsDBNull(2) ? null : reader.GetGuid(2));
    }

    private static async Task<Guid> InsertStockTransactionAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid warehouseId, Guid productId, string type, decimal quantity, Guid orderId, string key, CancellationToken cancellationToken)
    {
        const string sql = "insert into public.stock_transactions (warehouse_id, product_id, type, quantity_delta, reference_type, reference_id, idempotency_key) values (@warehouseId, @productId, @type::public.stock_tx_type, @quantity, 'order', @orderId, @key) returning id";
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("warehouseId", warehouseId); command.Parameters.AddWithValue("productId", productId);
        command.Parameters.AddWithValue("type", type); command.Parameters.AddWithValue("quantity", quantity);
        command.Parameters.AddWithValue("orderId", orderId); command.Parameters.AddWithValue("key", key);
        return (Guid)(await command.ExecuteScalarAsync(cancellationToken))!;
    }

    private static async Task InsertReceiptAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string operation, string key, string payload, Guid? stockTransactionId, CancellationToken cancellationToken)
    {
        const string sql = "insert into public.inventory_operation_receipts (operation, idempotency_key, payload, stock_transaction_id) values (@operation, @key, @payload, @transactionId)";
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("operation", operation); command.Parameters.AddWithValue("key", key);
        command.Parameters.Add("payload", NpgsqlDbType.Jsonb).Value = payload;
        command.Parameters.Add("transactionId", NpgsqlDbType.Uuid).Value = (object?)stockTransactionId ?? DBNull.Value;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private sealed record Reservation(Guid WarehouseId, Guid ProductId, decimal Quantity);
    private sealed record Receipt(Guid? StockTransactionId);
}
