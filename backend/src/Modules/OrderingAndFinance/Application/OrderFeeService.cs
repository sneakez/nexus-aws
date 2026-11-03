namespace NexusOMS.OrderingAndFinance;

public sealed class OrderFeeService(IOrderFeeRepository repository)
{
    public Task<IReadOnlyList<OrderFee>> ListAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        return repository.ListAsync(orderId, cancellationToken);
    }
    public Task<OrderFee> CreateAsync(
    OrderFee fee,
    Guid actorId,
    CancellationToken cancellationToken = default)
    {
        if (fee.Id == Guid.Empty || fee.OrderId == Guid.Empty)
            throw new ArgumentException("Mã khoản phí và mã đơn không được rỗng.");

        var feeType = fee.FeeType?.Trim().ToLowerInvariant();

        if (feeType is not (
            "commission" or
            "payment" or
            "shipping" or
            "packaging" or
            "ads" or
            "return_processing"))
        {
            throw new ArgumentException("Loại phí không hợp lệ.");
        }

        if (fee.Amount < 0
            || fee.Amount > 999999999999.99m
            || decimal.Round(fee.Amount, 2) != fee.Amount)
        {
            throw new ArgumentException(
                "Số tiền phải không âm, tối đa 12 chữ số nguyên và 2 chữ số thập phân.");
        }
        if (actorId == Guid.Empty)
            throw new ArgumentException("Thiếu mã người thực hiện.");

        var normalizedFee = fee with { FeeType = feeType };

        return repository.CreateAsync(
    normalizedFee,
    actorId,
    cancellationToken);
    }
}
