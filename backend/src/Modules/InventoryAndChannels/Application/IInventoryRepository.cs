namespace NexusOMS.InventoryAndChannels;

public interface IInventoryRepository
{
    Task<IReadOnlyList<InventoryItem>> ListAsync(Guid? warehouseId, Guid? productId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StockTransaction>> ListTransactionsAsync(Guid? warehouseId, Guid? productId, string? type, CancellationToken cancellationToken = default);
    Task<InventoryChangeResult> ReceiveAsync(Guid warehouseId, Guid productId, decimal quantity, string? idempotencyKey, CancellationToken cancellationToken = default);
    Task<InventoryChangeResult> AdjustAsync(Guid warehouseId, Guid productId, decimal quantityDelta, string? idempotencyKey, CancellationToken cancellationToken = default);
}
