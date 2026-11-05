using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresLedgerAccountRepository(NpgsqlDataSource dataSource) : ILedgerAccountRepository
{
    public async Task<IReadOnlyList<LedgerAccount>> ListAsync(CancellationToken cancellationToken = default)
    {
        const string sql = "select id, code, name from public.ledger_accounts order by code, id";
        await using var command = dataSource.CreateCommand(sql);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var accounts = new List<LedgerAccount>();
        while (await reader.ReadAsync(cancellationToken))
            accounts.Add(new LedgerAccount(reader.GetGuid(0), reader.GetString(1), reader.GetString(2)));
        return accounts;
    }
}
