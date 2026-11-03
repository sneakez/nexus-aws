namespace NexusOMS.InventoryAndChannels;

public sealed class ProductService(IProductRepository repository)
{
    public Task<IReadOnlyList<Product>> ListAsync(ActivityStatus status, CancellationToken cancellationToken = default) => repository.ListAsync(status, cancellationToken);
    public Task<Product?> GetAsync(Guid id, CancellationToken cancellationToken = default) => repository.GetAsync(id, cancellationToken);
    public Task<Product> CreateAsync(Guid? brandId, ProductInput input, CancellationToken cancellationToken = default) =>
        repository.CreateAsync(brandId, ProductInput.Normalize(input.Sku, input.Name, input.CostPrice), cancellationToken);
    public Task<Product?> UpdateAsync(Guid id, Guid? brandId, ProductInput input, bool isActive, CancellationToken cancellationToken = default) =>
        repository.UpdateAsync(id, brandId, ProductInput.Normalize(input.Sku, input.Name, input.CostPrice), isActive, cancellationToken);
    public Task<bool> DeactivateAsync(Guid id, CancellationToken cancellationToken = default) => repository.DeactivateAsync(id, cancellationToken);
}
