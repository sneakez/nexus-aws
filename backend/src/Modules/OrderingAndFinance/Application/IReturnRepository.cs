using NexusOMS.OrderingAndFinance;

public interface IReturnRepository
{
    Task<IReadOnlyList<ReturnCaseSummary>> ListAsync(
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken = default);

    Task<ReturnCase?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<CreateReturnResult> CreateAsync(
        CreateReturnRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default);
}
