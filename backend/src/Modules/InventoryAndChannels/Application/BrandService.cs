namespace NexusOMS.InventoryAndChannels;

public sealed class BrandService(IBrandRepository repository)
{
    public Task<IReadOnlyList<Brand>> ListAsync(CancellationToken cancellationToken = default) => repository.ListAsync(cancellationToken);
    public Task<Brand?> GetAsync(Guid id, CancellationToken cancellationToken = default) => repository.GetAsync(id, cancellationToken);
    public Task<Brand> CreateAsync(string name, CancellationToken cancellationToken = default) => repository.CreateAsync(BrandName.Normalize(name), cancellationToken);
    public Task<Brand?> UpdateAsync(Guid id, string name, CancellationToken cancellationToken = default) => repository.UpdateAsync(id, BrandName.Normalize(name), cancellationToken);
    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default) => repository.DeleteAsync(id, cancellationToken);
}
