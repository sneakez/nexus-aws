namespace NexusOMS.OrderingAndFinance;

public sealed class OrderShippingService(
    IOrderShippingRepository repository)
{
    public Task<ShipOrderResult?> ShipAsync(
        Guid orderId,
        ShipOrderRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Mã đơn hàng không hợp lệ.");

        if (actorId == Guid.Empty)
            throw new ArgumentException("Người xuất kho không hợp lệ.");

        var normalized = ShipOrderValidator.Normalize(request);

        return repository.ShipAsync(
            orderId,
            normalized,
            actorId,
            cancellationToken);
    }
}
