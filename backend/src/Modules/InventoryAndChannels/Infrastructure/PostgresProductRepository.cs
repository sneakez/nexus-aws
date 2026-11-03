using Npgsql;
using NpgsqlTypes;

namespace NexusOMS.InventoryAndChannels;

public sealed class PostgresProductRepository(NpgsqlDataSource dataSource) : IProductRepository
{
    public async Task<IReadOnlyList<Product>> ListAsync(ActivityStatus status, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select p.id, p.brand_id, b.name, p.sku, p.name, p.cost_price, p.is_active, p.created_at, p.updated_at
            from public.products p
            left join public.brands b on b.id = p.brand_id
            where @isActive is null or p.is_active = @isActive
            order by p.name
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("isActive", NpgsqlDbType.Boolean, (object?)ToIsActive(status) ?? DBNull.Value);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var products = new List<Product>();
        while (await reader.ReadAsync(cancellationToken)) products.Add(Read(reader));
        return products;
    }

    public async Task<Product?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select p.id, p.brand_id, b.name, p.sku, p.name, p.cost_price, p.is_active, p.created_at, p.updated_at
            from public.products p left join public.brands b on b.id = p.brand_id
            where p.id = @id
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        return await ReadSingleAsync(command, cancellationToken);
    }

    public async Task<Product> CreateAsync(Guid? brandId, ProductInput input, CancellationToken cancellationToken = default)
    {
        const string sql = """
            insert into public.products (brand_id, sku, name, cost_price)
            values (@brandId, @sku, @name, @costPrice)
            returning id, brand_id, (select name from public.brands where id = brand_id), sku, name, cost_price, is_active, created_at, updated_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        AddInputParameters(command, brandId, input);
        return await SaveAsync(command, cancellationToken) ?? throw new InvalidOperationException("Product could not be created.");
    }

    public async Task<Product?> UpdateAsync(Guid id, Guid? brandId, ProductInput input, bool isActive, CancellationToken cancellationToken = default)
    {
        const string sql = """
            update public.products
            set brand_id = @brandId, sku = @sku, name = @name, cost_price = @costPrice, is_active = @isActive, updated_at = now()
            where id = @id
            returning id, brand_id, (select name from public.brands where id = brand_id), sku, name, cost_price, is_active, created_at, updated_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("isActive", isActive);
        AddInputParameters(command, brandId, input);
        return await SaveAsync(command, cancellationToken);
    }

    public async Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand("update public.products set is_active = false, updated_at = now() where id = @id");
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static bool? ToIsActive(ActivityStatus status) => status switch
    {
        ActivityStatus.Active => true,
        ActivityStatus.Inactive => false,
        ActivityStatus.All => null,
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    private static void AddInputParameters(NpgsqlCommand command, Guid? brandId, ProductInput input)
    {
        command.Parameters.Add("brandId", NpgsqlDbType.Uuid).Value = (object?)brandId ?? DBNull.Value;
        command.Parameters.AddWithValue("sku", input.Sku);
        command.Parameters.AddWithValue("name", input.Name);
        command.Parameters.AddWithValue("costPrice", input.CostPrice);
    }

    private static async Task<Product?> SaveAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        try { return await ReadSingleAsync(command, cancellationToken); }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation) { throw new ProductSkuAlreadyExistsException(); }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation) { throw new BrandNotFoundException(); }
    }

    private static async Task<Product?> ReadSingleAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }

    private static Product Read(NpgsqlDataReader reader) => new(
        reader.GetGuid(0), reader.IsDBNull(1) ? null : reader.GetGuid(1), reader.IsDBNull(2) ? null : reader.GetString(2),
        reader.GetString(3), reader.GetString(4), reader.GetDecimal(5), reader.GetBoolean(6),
        reader.GetFieldValue<DateTimeOffset>(7), reader.GetFieldValue<DateTimeOffset>(8));
}
