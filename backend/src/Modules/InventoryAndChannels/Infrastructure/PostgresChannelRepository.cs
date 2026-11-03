using Npgsql;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresChannelRepository(NpgsqlDataSource dataSource) : IChannelRepository
{
    public async Task<IReadOnlyList<ChannelConnection>> ListConnectionsAsync(CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand("select id, type::text, account_name, status, created_at, updated_at from public.channel_connections order by type, account_name");
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var connections = new List<ChannelConnection>(); while (await reader.ReadAsync(cancellationToken)) connections.Add(ReadConnection(reader)); return connections;
    }
    public async Task<ChannelConnection?> GetConnectionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand("select id, type::text, account_name, status, created_at, updated_at from public.channel_connections where id = @id"); command.Parameters.AddWithValue("id", id); return await ReadConnectionAsync(command, cancellationToken);
    }
    public async Task<ChannelConnection> CreateConnectionAsync(ChannelConnectionInput input, CancellationToken cancellationToken = default)
    {
        const string sql = "insert into public.channel_connections (type, account_name, status) values (@type::public.channel_type, @accountName, @status) returning id, type::text, account_name, status, created_at, updated_at";
        await using var command = dataSource.CreateCommand(sql); AddConnectionParameters(command, input); return await SaveConnectionAsync(command, cancellationToken) ?? throw new InvalidOperationException("Channel connection could not be created.");
    }
    public async Task<ChannelConnection?> UpdateConnectionAsync(Guid id, ChannelConnectionInput input, CancellationToken cancellationToken = default)
    {
        const string sql = "update public.channel_connections set type = @type::public.channel_type, account_name = @accountName, status = @status, updated_at = now() where id = @id returning id, type::text, account_name, status, created_at, updated_at";
        await using var command = dataSource.CreateCommand(sql); command.Parameters.AddWithValue("id", id); AddConnectionParameters(command, input); return await SaveConnectionAsync(command, cancellationToken);
    }
    public async Task<bool> DeleteConnectionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand("delete from public.channel_connections where id = @id"); command.Parameters.AddWithValue("id", id); return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }
    public async Task<IReadOnlyList<ChannelSkuMapping>> ListMappingsAsync(Guid connectionId, CancellationToken cancellationToken = default)
    {
        const string sql = "select m.id, m.channel_connection_id, m.product_id, p.sku, p.name, m.channel_sku, m.created_at from public.channel_sku_mappings m join public.products p on p.id = m.product_id where m.channel_connection_id = @connectionId order by m.channel_sku";
        await using var command = dataSource.CreateCommand(sql); command.Parameters.AddWithValue("connectionId", connectionId); await using var reader = await command.ExecuteReaderAsync(cancellationToken); var mappings = new List<ChannelSkuMapping>(); while (await reader.ReadAsync(cancellationToken)) mappings.Add(ReadMapping(reader)); return mappings;
    }
    public async Task<ChannelSkuMapping> CreateMappingAsync(Guid connectionId, ChannelSkuMappingInput input, CancellationToken cancellationToken = default)
    {
        const string sql = "insert into public.channel_sku_mappings (channel_connection_id, product_id, channel_sku) values (@connectionId, @productId, @channelSku) returning id, channel_connection_id, product_id, (select sku from public.products where id = product_id), (select name from public.products where id = product_id), channel_sku, created_at";
        await using var command = dataSource.CreateCommand(sql); command.Parameters.AddWithValue("connectionId", connectionId); command.Parameters.AddWithValue("productId", input.ProductId); command.Parameters.AddWithValue("channelSku", input.ChannelSku); return await SaveMappingAsync(command, cancellationToken) ?? throw new InvalidOperationException("SKU mapping could not be created.");
    }
    public async Task<bool> DeleteMappingAsync(Guid connectionId, Guid id, CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand("delete from public.channel_sku_mappings where channel_connection_id = @connectionId and id = @id"); command.Parameters.AddWithValue("connectionId", connectionId); command.Parameters.AddWithValue("id", id); return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }
    private static void AddConnectionParameters(NpgsqlCommand command, ChannelConnectionInput input) { command.Parameters.AddWithValue("type", input.Type); command.Parameters.AddWithValue("accountName", input.AccountName); command.Parameters.AddWithValue("status", input.Status); }
    private static async Task<ChannelConnection?> SaveConnectionAsync(NpgsqlCommand command, CancellationToken cancellationToken) { try { return await ReadConnectionAsync(command, cancellationToken); } catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation) { throw new ChannelConnectionAlreadyExistsException(); } }
    private static async Task<ChannelSkuMapping?> SaveMappingAsync(NpgsqlCommand command, CancellationToken cancellationToken) { try { await using var reader = await command.ExecuteReaderAsync(cancellationToken); return await reader.ReadAsync(cancellationToken) ? ReadMapping(reader) : null; } catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation) { throw new ChannelSkuMappingAlreadyExistsException(); } catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation) { throw new ChannelConnectionNotFoundException(); } }
    private static async Task<ChannelConnection?> ReadConnectionAsync(NpgsqlCommand command, CancellationToken cancellationToken) { await using var reader = await command.ExecuteReaderAsync(cancellationToken); return await reader.ReadAsync(cancellationToken) ? ReadConnection(reader) : null; }
    private static ChannelConnection ReadConnection(NpgsqlDataReader reader) => new(reader.GetGuid(0), reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetFieldValue<DateTimeOffset>(4), reader.GetFieldValue<DateTimeOffset>(5));
    private static ChannelSkuMapping ReadMapping(NpgsqlDataReader reader) => new(reader.GetGuid(0), reader.GetGuid(1), reader.GetGuid(2), reader.GetString(3), reader.GetString(4), reader.GetString(5), reader.GetFieldValue<DateTimeOffset>(6));
}
