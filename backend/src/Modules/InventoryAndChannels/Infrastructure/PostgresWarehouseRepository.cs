using Npgsql;
using NpgsqlTypes;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresWarehouseRepository(NpgsqlDataSource dataSource) : IWarehouseRepository
{
    public async Task<IReadOnlyList<Warehouse>> ListAsync(ActivityStatus status, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select id, code, name, address, priority, is_active, created_at, updated_at
            from public.warehouses
            where @isActive is null or is_active = @isActive
            order by priority, name
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("isActive", NpgsqlDbType.Boolean, (object?)(status == ActivityStatus.All ? null : status == ActivityStatus.Active) ?? DBNull.Value);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var warehouses = new List<Warehouse>();
        while (await reader.ReadAsync(cancellationToken)) warehouses.Add(Read(reader));
        return warehouses;
    }

    public async Task<Warehouse?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "select id, code, name, address, priority, is_active, created_at, updated_at from public.warehouses where id = @id";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        return await ReadSingleAsync(command, cancellationToken);
    }

    public async Task<Warehouse> CreateAsync(WarehouseInput input, CancellationToken cancellationToken = default)
    {
        const string sql = """
            insert into public.warehouses (code, name, address, priority)
            values (@code, @name, @address, @priority)
            returning id, code, name, address, priority, is_active, created_at, updated_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        AddInputParameters(command, input);
        return await SaveAsync(command, cancellationToken) ?? throw new InvalidOperationException("Warehouse could not be created.");
    }

    public async Task<Warehouse?> UpdateAsync(Guid id, WarehouseInput input, bool isActive, CancellationToken cancellationToken = default)
    {
        const string sql = """
            update public.warehouses
            set code = @code, name = @name, address = @address, priority = @priority, is_active = @isActive, updated_at = now()
            where id = @id
            returning id, code, name, address, priority, is_active, created_at, updated_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("isActive", isActive);
        AddInputParameters(command, input);
        return await SaveAsync(command, cancellationToken);
    }

    public async Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand("update public.warehouses set is_active = false, updated_at = now() where id = @id");
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static void AddInputParameters(NpgsqlCommand command, WarehouseInput input)
    {
        command.Parameters.AddWithValue("code", input.Code);
        command.Parameters.AddWithValue("name", input.Name);
        command.Parameters.Add("address", NpgsqlDbType.Text).Value = (object?)input.Address ?? DBNull.Value;
        command.Parameters.AddWithValue("priority", input.Priority);
    }

    private static async Task<Warehouse?> SaveAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        try { return await ReadSingleAsync(command, cancellationToken); }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation) { throw new WarehouseCodeAlreadyExistsException(); }
    }

    private static async Task<Warehouse?> ReadSingleAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }

    private static Warehouse Read(NpgsqlDataReader reader) => new(
        reader.GetGuid(0), reader.GetString(1), reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetString(3),
        reader.GetInt32(4), reader.GetBoolean(5), reader.GetFieldValue<DateTimeOffset>(6), reader.GetFieldValue<DateTimeOffset>(7));
}
