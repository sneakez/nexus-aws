namespace NexusOMS.OrderingAndFinance;

public interface IOrderFeeRepository
{
    Task<IReadOnlyList<OrderFee>> ListAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);
    Task<OrderFee> CreateAsync(
     OrderFee fee,
     Guid actorId,
     CancellationToken cancellationToken = default);
}
