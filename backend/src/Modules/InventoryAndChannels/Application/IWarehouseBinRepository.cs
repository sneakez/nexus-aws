namespace NexusOMS.InventoryAndChannels;

public interface IWarehouseBinRepository
{
    Task<IReadOnlyList<WarehouseBin>> ListAsync(Guid warehouseId, CancellationToken cancellationToken = default);
    Task<WarehouseBin?> GetAsync(Guid warehouseId, Guid id, CancellationToken cancellationToken = default);
    Task<WarehouseBin> CreateAsync(Guid warehouseId, WarehouseBinInput input, CancellationToken cancellationToken = default);
    Task<WarehouseBin?> UpdateAsync(Guid warehouseId, Guid id, WarehouseBinInput input, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid warehouseId, Guid id, CancellationToken cancellationToken = default);
}
