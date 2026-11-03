using Npgsql;

namespace NexusOMS.InventoryAndChannels;

public sealed record Brand(Guid Id, string Name, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed class BrandService(NpgsqlDataSource dataSource)
{
    //Take all brands from the database and return them as a list of Brand objects
    public async Task<IReadOnlyList<Brand>> ListAsync(CancellationToken cancellationToken = default)
    {
        const string sql = "select id, name, created_at, updated_at from public.brands order by name";
        await using var command = dataSource.CreateCommand(sql);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var brands = new List<Brand>();
        while (await reader.ReadAsync(cancellationToken))
            brands.Add(Read(reader));

        return brands;
    }

    //Get brand by id from the database and return it as a Brand object, or null if not found
    public async Task<Brand?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "select id, name, created_at, updated_at from public.brands where id = @id";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }

    // Create a new brand by using name return id, name, created_at, updated_at as a Brand object
    public async Task<Brand> CreateAsync(string name, CancellationToken cancellationToken = default)
    {
        const string sql = """
            insert into public.brands (name)
            values (@name)
            returning id, name, created_at, updated_at
            """;
        return await SaveAsync(sql, name, cancellationToken);
    }

    // Update an existing brand by using id and name return id, name, created_at, updated_at
    // as a Brand object or null if not found
    public async Task<Brand?> UpdateAsync(Guid id, string name, CancellationToken cancellationToken = default)
    {
        const string sql = """
            update public.brands
            set name = @name, updated_at = now()
            where id = @id
            returning id, name, created_at, updated_at
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("name", name);
        return await SaveAsync(command, cancellationToken);
    }

    // Delete an existing brand by using id return true if deleted, false if not found
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "delete from public.brands where id = @id";
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    // Save a brand to the database and return it as a Brand object, or throw an exception if it could not be created
    private async Task<Brand> SaveAsync(string sql, string name, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("name", name);
        return await SaveAsync(command, cancellationToken)
            ?? throw new InvalidOperationException("Brand could not be created.");
    }

    // Save a brand to the database and return it as a Brand object, or null if not found
    private static async Task<Brand?> SaveAsync(NpgsqlCommand command, CancellationToken cancellationToken)
    {
        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new BrandAlreadyExistsException();
        }
    }

    private static Brand Read(NpgsqlDataReader reader) => new(
        reader.GetGuid(0), reader.GetString(1), reader.GetFieldValue<DateTimeOffset>(2), reader.GetFieldValue<DateTimeOffset>(3));
}

public static class BrandName
{
    public static string Normalize(string? value)
    {
        var name = value?.Trim() ?? string.Empty;
        if (name.Length is 0 or > 120)
            throw new ArgumentException("Brand name must contain 1 to 120 characters.");

        return name;
    }
}

public sealed class BrandAlreadyExistsException : Exception;
