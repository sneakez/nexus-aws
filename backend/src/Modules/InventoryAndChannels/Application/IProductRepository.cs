namespace NexusOMS.InventoryAndChannels;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> ListAsync(ActivityStatus status, CancellationToken cancellationToken = default);
    Task<Product?> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Product> CreateAsync(Guid? brandId, ProductInput input, CancellationToken cancellationToken = default);
    Task<Product?> UpdateAsync(Guid id, Guid? brandId, ProductInput input, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default);
}
