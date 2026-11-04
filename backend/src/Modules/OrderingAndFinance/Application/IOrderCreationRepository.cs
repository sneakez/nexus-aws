namespace NexusOMS.OrderingAndFinance;

public interface IOrderCreationRepository
{
    Task<CreateOrderResult?> FindReplayAsync(
    CreateOrderRequest request,
    CancellationToken cancellationToken = default);
    Task<CreateOrderResult> CreateAsync(
        CreateOrderRequest request,
        PreparedOrder prepared,
        Guid actorId,
        CancellationToken cancellationToken = default);
}
