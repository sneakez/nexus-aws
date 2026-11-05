namespace NexusOMS.OrderingAndFinance;

public interface ILedgerAccountRepository
{
    Task<IReadOnlyList<LedgerAccount>> ListAsync(CancellationToken cancellationToken = default);
}

public sealed class LedgerAccountService(ILedgerAccountRepository repository)
{
    public Task<IReadOnlyList<LedgerAccount>> ListAsync(CancellationToken cancellationToken = default) =>
        repository.ListAsync(cancellationToken);
}
