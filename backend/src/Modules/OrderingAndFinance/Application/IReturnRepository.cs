using NexusOMS.OrderingAndFinance;

public interface IReturnRepository
{
    Task<ReturnCase?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<CreateReturnResult> CreateAsync(
        CreateReturnRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default);
}
