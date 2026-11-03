using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresCustomerRepository(NpgsqlDataSource dataSource) : ICustomerRepository
{
    public async Task<IReadOnlyList<Customer>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            select id, name, phone, email
            from public.customers
            order by created_at desc, id
            limit 100
            """;

        await using var command = dataSource.CreateCommand(sql);
        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var customers = new List<Customer>();

        while (await reader.ReadAsync(cancellationToken))
        {
            customers.Add(new Customer(
                reader.GetGuid(0),
                reader.IsDBNull(1) ? null : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3)));
        }

        return customers;
    }
    public async Task<Customer> CreateAsync(
    string name,
    string? phone,
    string? email,
    CancellationToken cancellationToken = default)
    {
        const string sql = """
        insert into public.customers (name, phone, email)
        values (@name, @phone, @email)
        returning id, name, phone, email
        """;

        await using var command = dataSource.CreateCommand(sql);

        command.Parameters.AddWithValue("name", name);
        command.Parameters.AddWithValue(
            "phone",
            NpgsqlTypes.NpgsqlDbType.Text,
            (object?)phone ?? DBNull.Value);
        command.Parameters.AddWithValue(
            "email",
            NpgsqlTypes.NpgsqlDbType.Text,
            (object?)email ?? DBNull.Value);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            throw new InvalidOperationException(
                "Không thể tạo khách hàng.");

        return new Customer(
            reader.GetGuid(0),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3));
    }
}
