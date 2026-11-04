namespace NexusOMS.OrderingAndFinance;

public interface IOrderCancellationRepository
{
    Task<CancelOrderResult?> CancelAsync(
        Guid orderId,
        CancelOrderRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default);
}
