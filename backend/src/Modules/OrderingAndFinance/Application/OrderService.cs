namespace NexusOMS.OrderingAndFinance;

public sealed class OrderService(IOrderRepository repository)
{
    public Task<IReadOnlyList<OrderStatusEntry>?> GetHistoryAsync(Guid id, CancellationToken cancellationToken = default) =>
        repository.GetHistoryAsync(id, cancellationToken);
    public Task<IReadOnlyList<OrderSummary>> ListAsync(CancellationToken cancellationToken = default) => repository.ListAsync(cancellationToken);
    public Task<OrderDetail?> GetAsync(Guid id, CancellationToken cancellationToken = default) => repository.GetAsync(id, cancellationToken);
}
