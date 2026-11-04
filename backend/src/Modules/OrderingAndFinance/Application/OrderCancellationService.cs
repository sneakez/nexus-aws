namespace NexusOMS.OrderingAndFinance;

public sealed class OrderCancellationService(
    IOrderCancellationRepository repository)
{
    public Task<CancelOrderResult?> CancelAsync(
        Guid orderId,
        CancelOrderRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Mã đơn hàng không hợp lệ.");

        if (actorId == Guid.Empty)
            throw new ArgumentException("Người hủy đơn không hợp lệ.");

        var normalized = CancelOrderValidator.Normalize(request);

        return repository.CancelAsync(
            orderId,
            normalized,
            actorId,
            cancellationToken);
    }
}
