using Npgsql;
using NpgsqlTypes;
using NexusOMS.Contracts;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresProductCatalogContract(NpgsqlDataSource dataSource) : IProductCatalogContract
{
    public async Task<IReadOnlyList<ProductOrderSnapshot>> GetActiveProductsAsync(IReadOnlyList<Guid> productIds, CancellationToken cancellationToken = default)
    {
        if (productIds.Count == 0) return [];
        const string sql = "select id, sku, name, cost_price from public.products where is_active and id = any(@ids)";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.Add("ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid).Value = productIds.Distinct().ToArray();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var products = new List<ProductOrderSnapshot>();
        while (await reader.ReadAsync(cancellationToken))
            products.Add(new(reader.GetGuid(0), reader.GetString(1), reader.GetString(2), reader.GetDecimal(3)));
        return products;
    }
}
