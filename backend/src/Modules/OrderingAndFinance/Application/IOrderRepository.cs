namespace NexusOMS.OrderingAndFinance;

public interface IOrderRepository
{
    Task<IReadOnlyList<OrderSummary>> ListAsync(DateOnly? from, DateOnly? to, CancellationToken cancellationToken = default);
    Task<OrderDetail?> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrderStatusEntry>?> GetHistoryAsync(Guid id, CancellationToken cancellationToken = default);
}
