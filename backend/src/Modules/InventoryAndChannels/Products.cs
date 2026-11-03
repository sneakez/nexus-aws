using Npgsql;
using NpgsqlTypes;

namespace NexusOMS.InventoryAndChannels;

public sealed record Product(
    Guid Id,
    Guid? BrandId,
    string? BrandName,
    string Sku,
    string Name,
    decimal CostPrice,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ProductInput(string Sku, string Name, decimal CostPrice)
{
    public static ProductInput Normalize(string? sku, string? name, decimal costPrice)
    {
        var normalizedSku = sku?.Trim().ToUpperInvariant() ?? string.Empty;
        var normalizedName = name?.Trim() ?? string.Empty;

        if (normalizedSku.Length is 0 or > 100)
            throw new ArgumentException("SKU must contain 1 to 100 characters.");
        if (normalizedName.Length is 0 or > 255)
            throw new ArgumentException("Product name must contain 1 to 255 characters.");
        if (costPrice < 0)
            throw new ArgumentException("Cost price cannot be negative.");

        return new ProductInput(normalizedSku, normalizedName, costPrice);
    }
}

public sealed class ProductService(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<Product>> ListAsync(bool includeInactive, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select p.id, p.brand_id, b.name, p.sku, p.name, p.cost_price, p.is_active, p.created_at, p.updated_at
            from public.products p
            left join public.brands b on b.id = p.brand_id
            where @includeInactive or p.is_active
            order by p.name
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("includeInactive", includeInactive);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var products = new List<Product>();
        while (await reader.ReadAsync(cancellationToken))
            products.Add(Read(reader));

        return products;
    }

    public async Task<Product?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select p.id, p.brand_id, b.name, p.sku, p.name, p.cost_price, p.is_active, p.created_at, p.updated_at
            from public.products p
            left join public.brands b on b.id = p.brand_id
            where p.id = @id
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        return await ReadSingleAsync(command, cancellationToken);
    }

    public async Task<Product> CreateAsync(Guid? brandId, ProductInput input, CancellationToken cancellationToken = default)
    {
        await EnsureBrandExistsAsync(brandId, cancellationToken);
        const string sql = """
            insert into public.products (brand_id, sku, name, cost_price)
            values (@brandId, @sku, @name, @costPrice)
            returning id, brand_id, (select name from public.brands where id = brand_id), sku, name, cost_price, is_active, created_at, updated_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        AddInputParameters(command, brandId, input);
        return await SaveAsync(command, cancellationToken)
            ?? throw new InvalidOperationException("Product could not be created.");
    }

    public async Task<Product?> UpdateAsync(Guid id, Guid? brandId, ProductInput input, bool isActive, CancellationToken cancellationToken = default)
    {
        await EnsureBrandExistsAsync(brandId, cancellationToken);
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
        const string sql = "update public.products set is_active = false, updated_at = now() where id = @id";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private async Task EnsureBrandExistsAsync(Guid? brandId, CancellationToken cancellationToken)
    {
        if (brandId is null) return;

        const string sql = "select exists(select 1 from public.brands where id = @id)";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", brandId.Value);
        if (!(bool)(await command.ExecuteScalarAsync(cancellationToken))!)
            throw new BrandNotFoundException();
    }

    private static void AddInputParameters(NpgsqlCommand command, Guid? brandId, ProductInput input)
    {
        command.Parameters.Add("brandId", NpgsqlDbType.Uuid).Value = (object?)brandId ?? DBNull.Value;
        command.Parameters.AddWithValue("sku", input.Sku);
        command.Parameters.AddWithValue("name", input.Name);
        command.Parameters.AddWithValue("costPrice", input.CostPrice);
    }

    private static async Task<Product?> SaveAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        try
        {
            return await ReadSingleAsync(command, cancellationToken);
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new ProductSkuAlreadyExistsException();
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            throw new BrandNotFoundException();
        }
    }

    private static async Task<Product?> ReadSingleAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }

    private static Product Read(NpgsqlDataReader reader) => new(
        reader.GetGuid(0),
        reader.IsDBNull(1) ? null : reader.GetGuid(1),
        reader.IsDBNull(2) ? null : reader.GetString(2),
        reader.GetString(3),
        reader.GetString(4),
        reader.GetDecimal(5),
        reader.GetBoolean(6),
        reader.GetFieldValue<DateTimeOffset>(7),
        reader.GetFieldValue<DateTimeOffset>(8));
}

public sealed class ProductSkuAlreadyExistsException : Exception;
public sealed class BrandNotFoundException : Exception;
