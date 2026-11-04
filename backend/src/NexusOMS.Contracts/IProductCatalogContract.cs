namespace NexusOMS.Contracts;

public sealed record ProductOrderSnapshot(
    Guid Id,
    string Sku,
    string Name,
    decimal UnitCost);

public interface IProductCatalogContract
{
    Task<IReadOnlyList<ProductOrderSnapshot>> GetActiveProductsAsync(
        IReadOnlyList<Guid> productIds,
        CancellationToken cancellationToken = default);
}
