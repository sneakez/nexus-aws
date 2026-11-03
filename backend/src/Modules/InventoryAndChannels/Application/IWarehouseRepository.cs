namespace NexusOMS.InventoryAndChannels;

public interface IWarehouseRepository
{
    Task<IReadOnlyList<Warehouse>> ListAsync(ActivityStatus status, CancellationToken cancellationToken = default);
    Task<Warehouse?> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Warehouse> CreateAsync(WarehouseInput input, CancellationToken cancellationToken = default);
    Task<Warehouse?> UpdateAsync(Guid id, WarehouseInput input, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
}
