using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed record Customer(
    Guid Id,
    string? Name,
    string? Phone,
    string? Email);

public sealed class CustomerService(NpgsqlDataSource dataSource)
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
}
