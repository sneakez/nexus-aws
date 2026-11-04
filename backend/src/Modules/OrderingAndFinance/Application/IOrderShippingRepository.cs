namespace NexusOMS.OrderingAndFinance;

public interface IOrderShippingRepository
{
    Task<ShipOrderResult?> ShipAsync(
        Guid orderId,
        ShipOrderRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default);
}
