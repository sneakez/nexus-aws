using Npgsql;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresWarehouseBinRepository(NpgsqlDataSource dataSource) : IWarehouseBinRepository
{
    public async Task<IReadOnlyList<WarehouseBin>> ListAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        const string sql = "select id, warehouse_id, code, created_at from public.warehouse_bins where warehouse_id = @warehouseId order by code";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("warehouseId", warehouseId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var bins = new List<WarehouseBin>();
        while (await reader.ReadAsync(cancellationToken)) bins.Add(Read(reader));
        return bins;
    }

    public async Task<WarehouseBin?> GetAsync(Guid warehouseId, Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "select id, warehouse_id, code, created_at from public.warehouse_bins where warehouse_id = @warehouseId and id = @id";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("warehouseId", warehouseId);
        command.Parameters.AddWithValue("id", id);
        return await ReadSingleAsync(command, cancellationToken);
    }

    public async Task<WarehouseBin> CreateAsync(Guid warehouseId, WarehouseBinInput input, CancellationToken cancellationToken = default)
    {
        const string sql = """
            insert into public.warehouse_bins (warehouse_id, code)
            values (@warehouseId, @code)
            returning id, warehouse_id, code, created_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("warehouseId", warehouseId);
        command.Parameters.AddWithValue("code", input.Code);
        return await SaveAsync(command, cancellationToken) ?? throw new InvalidOperationException("Warehouse bin could not be created.");
    }

    public async Task<WarehouseBin?> UpdateAsync(Guid warehouseId, Guid id, WarehouseBinInput input, CancellationToken cancellationToken = default)
    {
        const string sql = """
            update public.warehouse_bins set code = @code
            where warehouse_id = @warehouseId and id = @id
            returning id, warehouse_id, code, created_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("warehouseId", warehouseId);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("code", input.Code);
        return await SaveAsync(command, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid warehouseId, Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "delete from public.warehouse_bins where warehouse_id = @warehouseId and id = @id";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("warehouseId", warehouseId);
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static async Task<WarehouseBin?> SaveAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        try { return await ReadSingleAsync(command, cancellationToken); }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation) { throw new WarehouseBinAlreadyExistsException(); }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation) { throw new WarehouseNotFoundException(); }
    }

    private static async Task<WarehouseBin?> ReadSingleAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }

    private static WarehouseBin Read(NpgsqlDataReader reader) => new(
        reader.GetGuid(0), reader.GetGuid(1), reader.GetString(2), reader.GetFieldValue<DateTimeOffset>(3));
}
