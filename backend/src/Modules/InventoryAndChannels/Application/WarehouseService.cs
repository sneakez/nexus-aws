namespace NexusOMS.InventoryAndChannels;

public sealed class WarehouseService(IWarehouseRepository repository)
{
    public Task<IReadOnlyList<Warehouse>> ListAsync(ActivityStatus status, CancellationToken cancellationToken = default) => repository.ListAsync(status, cancellationToken);
    public Task<Warehouse?> GetAsync(Guid id, CancellationToken cancellationToken = default) => repository.GetAsync(id, cancellationToken);
    public Task<Warehouse> CreateAsync(WarehouseInput input, CancellationToken cancellationToken = default) =>
        repository.CreateAsync(WarehouseInput.Normalize(input.Code, input.Name, input.Address, input.Priority), cancellationToken);
    public Task<Warehouse?> UpdateAsync(Guid id, WarehouseInput input, bool isActive, CancellationToken cancellationToken = default) =>
        repository.UpdateAsync(id, WarehouseInput.Normalize(input.Code, input.Name, input.Address, input.Priority), isActive, cancellationToken);
    public Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default) => repository.DeactivateAsync(id, cancellationToken);
}
