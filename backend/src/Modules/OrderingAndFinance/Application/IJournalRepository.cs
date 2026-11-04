namespace NexusOMS.OrderingAndFinance;

public interface IJournalRepository
{
    Task<JournalDetail?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<CreateJournalResult> CreateAsync(
        CreateJournalRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default);
}
