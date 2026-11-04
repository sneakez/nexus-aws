namespace NexusOMS.OrderingAndFinance;

public sealed class OrderProgressService(IOrderProgressRepository repository)
{
    public Task<OrderProgressResult?> AdvanceAsync(Guid orderId, string operation,
        OrderProgressRequest request, Guid actorId, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (orderId == Guid.Empty || actorId == Guid.Empty)
            throw new ArgumentException("Mã đơn và người thực hiện không hợp lệ.");
        if (operation is not ("confirm" or "process"))
            throw new ArgumentException("Thao tác chuyển trạng thái không hợp lệ.");
        var key = request.IdempotencyKey?.Trim() ?? string.Empty;
        if (key.Length is 0 or > 120)
            throw new ArgumentException("Khóa chống trùng phải có từ 1 đến 120 ký tự.");
        return repository.AdvanceAsync(orderId, operation, request with { IdempotencyKey = key }, actorId, cancellationToken);
    }
}
