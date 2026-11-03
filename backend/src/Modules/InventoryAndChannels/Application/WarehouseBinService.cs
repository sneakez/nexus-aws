namespace NexusOMS.InventoryAndChannels;

public sealed class WarehouseBinService(IWarehouseBinRepository repository)
{
    public Task<IReadOnlyList<WarehouseBin>> ListAsync(Guid warehouseId, CancellationToken cancellationToken = default) =>
        repository.ListAsync(warehouseId, cancellationToken);
    public Task<WarehouseBin?> GetAsync(Guid warehouseId, Guid id, CancellationToken cancellationToken = default) =>
        repository.GetAsync(warehouseId, id, cancellationToken);
    public Task<WarehouseBin> CreateAsync(Guid warehouseId, WarehouseBinInput input, CancellationToken cancellationToken = default) =>
        repository.CreateAsync(warehouseId, WarehouseBinInput.Normalize(input.Code), cancellationToken);
    public Task<WarehouseBin?> UpdateAsync(Guid warehouseId, Guid id, WarehouseBinInput input, CancellationToken cancellationToken = default) =>
        repository.UpdateAsync(warehouseId, id, WarehouseBinInput.Normalize(input.Code), cancellationToken);
    public Task<bool> DeleteAsync(Guid warehouseId, Guid id, CancellationToken cancellationToken = default) =>
        repository.DeleteAsync(warehouseId, id, cancellationToken);
}
