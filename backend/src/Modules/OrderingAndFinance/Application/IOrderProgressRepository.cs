namespace NexusOMS.OrderingAndFinance;

public interface IOrderProgressRepository
{
    Task<OrderProgressResult?> AdvanceAsync(Guid orderId, string operation,
        OrderProgressRequest request, Guid actorId, CancellationToken cancellationToken = default);
}
