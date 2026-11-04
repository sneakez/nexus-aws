using Npgsql;
using NpgsqlTypes;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresInventoryRepository(NpgsqlDataSource dataSource) : IInventoryRepository
{
    public async Task<IReadOnlyList<InventoryItem>> ListAsync(Guid? warehouseId, Guid? productId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select i.id, i.warehouse_id, w.code, i.product_id, p.sku, p.name, i.bin_id, b.code,
                   i.stock, i.reserved, i.pending_qc, i.incoming, i.stock - i.reserved, i.updated_at
            from public.inventory_items i join public.warehouses w on w.id = i.warehouse_id
            join public.products p on p.id = i.product_id left join public.warehouse_bins b on b.id = i.bin_id
            where (@warehouseId is null or i.warehouse_id = @warehouseId) and (@productId is null or i.product_id = @productId)
            order by w.priority, w.name, p.name
            """;
        await using var command = dataSource.CreateCommand(sql);
        AddNullableGuid(command, "warehouseId", warehouseId);
        AddNullableGuid(command, "productId", productId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<InventoryItem>();
        while (await reader.ReadAsync(cancellationToken)) items.Add(ReadItem(reader));
        return items;
    }

    public async Task<IReadOnlyList<StockTransaction>> ListTransactionsAsync(Guid? warehouseId, Guid? productId, string? type, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select id, warehouse_id, product_id, type::text, quantity_delta, reference_type, reference_id, idempotency_key, created_at
            from public.stock_transactions
            where (@warehouseId is null or warehouse_id = @warehouseId) and (@productId is null or product_id = @productId)
              and (@type is null or type::text = @type)
            order by created_at desc
            """;
        await using var command = dataSource.CreateCommand(sql);
        AddNullableGuid(command, "warehouseId", warehouseId);
        AddNullableGuid(command, "productId", productId);
        command.Parameters.Add("type", NpgsqlDbType.Text).Value = (object?)type ?? DBNull.Value;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var transactions = new List<StockTransaction>();
        while (await reader.ReadAsync(cancellationToken)) transactions.Add(new StockTransaction(
            reader.GetGuid(0), reader.GetGuid(1), reader.GetGuid(2), reader.GetString(3), reader.GetDecimal(4),
            reader.IsDBNull(5) ? null : reader.GetString(5), reader.IsDBNull(6) ? null : reader.GetGuid(6),
            reader.IsDBNull(7) ? null : reader.GetString(7), reader.GetFieldValue<DateTimeOffset>(8)));
        return transactions;
    }

    public Task<InventoryChangeResult> ReceiveAsync(Guid warehouseId, Guid productId, decimal quantity, string? idempotencyKey, Guid actorId, CancellationToken cancellationToken = default) =>
        ChangeAsync(warehouseId, productId, quantity, "inbound", idempotencyKey, actorId, cancellationToken);

    public Task<InventoryChangeResult> AdjustAsync(Guid warehouseId, Guid productId, decimal quantityDelta, string? idempotencyKey, Guid actorId, CancellationToken cancellationToken = default) =>
        ChangeAsync(warehouseId, productId, quantityDelta, "adjustment", idempotencyKey, actorId, cancellationToken);

    private async Task<InventoryChangeResult> ChangeAsync(Guid warehouseId, Guid productId, decimal quantityDelta, string type, string? idempotencyKey, Guid actorId, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            var inventorySql = quantityDelta < 0
                ? """
                    update public.inventory_items set stock = stock + @quantityDelta, updated_at = now()
                    where warehouse_id = @warehouseId and product_id = @productId
                    returning id, warehouse_id, product_id, bin_id, stock, reserved, pending_qc, incoming, updated_at
                    """
                : """
                    insert into public.inventory_items (warehouse_id, product_id, stock)
                    values (@warehouseId, @productId, @quantityDelta)
                    on conflict (warehouse_id, product_id) do update
                      set stock = public.inventory_items.stock + excluded.stock, updated_at = now()
                    returning id, warehouse_id, product_id, bin_id, stock, reserved, pending_qc, incoming, updated_at
                    """;
            await using var inventoryCommand = new NpgsqlCommand(inventorySql, connection, transaction);
            inventoryCommand.Parameters.AddWithValue("warehouseId", warehouseId);
            inventoryCommand.Parameters.AddWithValue("productId", productId);
            inventoryCommand.Parameters.AddWithValue("quantityDelta", quantityDelta);
            await using var reader = await inventoryCommand.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) throw new InsufficientStockException();
            var raw = new RawItem(reader.GetGuid(0), reader.GetGuid(1), reader.GetGuid(2), reader.IsDBNull(3) ? null : reader.GetGuid(3), reader.GetDecimal(4), reader.GetDecimal(5), reader.GetDecimal(6), reader.GetDecimal(7), reader.GetFieldValue<DateTimeOffset>(8));
            await reader.DisposeAsync();

            const string log = """
                insert into public.stock_transactions (warehouse_id, product_id, type, quantity_delta, reference_type, idempotency_key)
                values (@warehouseId, @productId, @type::public.stock_tx_type, @quantityDelta, 'manual', @idempotencyKey)
                returning id
                """;
            await using var logCommand = new NpgsqlCommand(log, connection, transaction);
            logCommand.Parameters.AddWithValue("warehouseId", warehouseId);
            logCommand.Parameters.AddWithValue("productId", productId);
            logCommand.Parameters.AddWithValue("type", type);
            logCommand.Parameters.AddWithValue("quantityDelta", quantityDelta);
            logCommand.Parameters.Add("idempotencyKey", NpgsqlDbType.Text).Value = (object?)idempotencyKey ?? DBNull.Value;
            var transactionId = (Guid)(await logCommand.ExecuteScalarAsync(cancellationToken))!;

            const string audit = """
                insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
                values (@actorId, @action, 'stock_transactions', @transactionId,
                    jsonb_build_object('warehouseId', @warehouseId, 'productId', @productId,
                        'quantityDelta', @quantityDelta, 'idempotencyKey', @idempotencyKey))
                """;
            await using var auditCommand = new NpgsqlCommand(audit, connection, transaction);
            auditCommand.Parameters.AddWithValue("actorId", actorId);
            auditCommand.Parameters.AddWithValue("action", type == "inbound" ? "inventory.received" : "inventory.adjusted");
            auditCommand.Parameters.AddWithValue("transactionId", transactionId);
            auditCommand.Parameters.AddWithValue("warehouseId", warehouseId);
            auditCommand.Parameters.AddWithValue("productId", productId);
            auditCommand.Parameters.AddWithValue("quantityDelta", quantityDelta);
            auditCommand.Parameters.Add("idempotencyKey", NpgsqlDbType.Text).Value = (object?)idempotencyKey ?? DBNull.Value;
            await auditCommand.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new InventoryChangeResult(await ReadItemAsync(raw, cancellationToken), transactionId);
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation) { await transaction.RollbackAsync(cancellationToken); throw new DuplicateStockOperationException(); }
        catch (PostgresException exception) when (exception.SqlState is PostgresErrorCodes.CheckViolation or PostgresErrorCodes.ForeignKeyViolation) { await transaction.RollbackAsync(cancellationToken); throw new InsufficientStockException(); }
    }

    private async Task<InventoryItem> ReadItemAsync(RawItem item, CancellationToken cancellationToken)
    {
        const string sql = """
            select i.id, i.warehouse_id, w.code, i.product_id, p.sku, p.name, i.bin_id, b.code,
                   i.stock, i.reserved, i.pending_qc, i.incoming, i.stock - i.reserved, i.updated_at
            from public.inventory_items i join public.warehouses w on w.id = i.warehouse_id
            join public.products p on p.id = i.product_id left join public.warehouse_bins b on b.id = i.bin_id where i.id = @id
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", item.Id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadItem(reader) : throw new InvalidOperationException("Inventory item could not be read.");
    }

    private static void AddNullableGuid(NpgsqlCommand command, string name, Guid? value) => command.Parameters.Add(name, NpgsqlDbType.Uuid).Value = (object?)value ?? DBNull.Value;
    private static InventoryItem ReadItem(NpgsqlDataReader reader) => new(reader.GetGuid(0), reader.GetGuid(1), reader.GetString(2), reader.GetGuid(3), reader.GetString(4), reader.GetString(5), reader.IsDBNull(6) ? null : reader.GetGuid(6), reader.IsDBNull(7) ? null : reader.GetString(7), reader.GetDecimal(8), reader.GetDecimal(9), reader.GetDecimal(10), reader.GetDecimal(11), reader.GetDecimal(12), reader.GetFieldValue<DateTimeOffset>(13));
    private sealed record RawItem(Guid Id, Guid WarehouseId, Guid ProductId, Guid? BinId, decimal Stock, decimal Reserved, decimal PendingQc, decimal Incoming, DateTimeOffset UpdatedAt);
}
