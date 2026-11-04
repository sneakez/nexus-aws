namespace NexusOMS.InventoryAndChannels;

public sealed class InventoryService(IInventoryRepository repository)
{
    public Task<IReadOnlyList<InventoryItem>> ListAsync(Guid? warehouseId, Guid? productId, CancellationToken cancellationToken = default) =>
        repository.ListAsync(warehouseId, productId, cancellationToken);
    public Task<IReadOnlyList<StockTransaction>> ListTransactionsAsync(Guid? warehouseId, Guid? productId, string? type, CancellationToken cancellationToken = default) =>
        repository.ListTransactionsAsync(warehouseId, productId, type, cancellationToken);
    public Task<InventoryChangeResult> ReceiveAsync(Guid warehouseId, Guid productId, decimal quantity, string? idempotencyKey, Guid actorId, CancellationToken cancellationToken = default) =>
        repository.ReceiveAsync(warehouseId, productId, InventoryInput.PositiveQuantity(quantity), NormalizeKey(idempotencyKey), RequireActor(actorId), cancellationToken);
    public Task<InventoryChangeResult> AdjustAsync(Guid warehouseId, Guid productId, decimal quantityDelta, string? idempotencyKey, Guid actorId, CancellationToken cancellationToken = default) =>
        repository.AdjustAsync(warehouseId, productId, InventoryInput.AdjustmentQuantity(quantityDelta), NormalizeKey(idempotencyKey), RequireActor(actorId), cancellationToken);

    private static string? NormalizeKey(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static Guid RequireActor(Guid actorId) => actorId != Guid.Empty ? actorId : throw new ArgumentException("Người thực hiện không hợp lệ.");
}
