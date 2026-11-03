namespace NexusOMS.InventoryAndChannels;

public interface IBrandRepository
{
    Task<IReadOnlyList<Brand>> ListAsync(CancellationToken cancellationToken = default);
    Task<Brand?> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Brand> CreateAsync(string name, CancellationToken cancellationToken = default);
    Task<Brand?> UpdateAsync(Guid id, string name, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
