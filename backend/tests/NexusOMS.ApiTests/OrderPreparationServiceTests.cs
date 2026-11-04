using NexusOMS.Contracts;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class OrderPreparationServiceTests
{
    [Fact]
    public async Task Uses_catalog_snapshot_and_calculates_line_total()
    {
        var productId = Guid.NewGuid();
        var catalog = new FakeCatalog(
            new ProductOrderSnapshot(
                productId, "SKU-001", "Sản phẩm thử", 60000m));

        var service = new OrderPreparationService(catalog);

        var request = new CreateOrderRequest(
            "test-create-001",
            "ORDER-001",
            null,
            Guid.NewGuid(),
            0m,
            0m,
            [new CreateOrderLineRequest(productId, 2m, 100000m)]);

        var prepared = await service.PrepareAsync(request);

        var line = Assert.Single(prepared.Items);
        Assert.Equal(productId, line.ProductId);
        Assert.Equal("SKU-001", line.ProductSku);
        Assert.Equal("Sản phẩm thử", line.ProductName);
        Assert.Equal(60000m, line.UnitCost);
        Assert.Equal(200000m, line.LineTotal);
    }
    [Fact]
    public async Task Rejects_product_missing_from_catalog()
    {
        var productId = Guid.NewGuid();
        var service = new OrderPreparationService(new FakeCatalog());

        var request = new CreateOrderRequest(
            "test-missing-product",
            "ORDER-002",
            null,
            Guid.NewGuid(),
            0m,
            0m,
            [new CreateOrderLineRequest(productId, 1m, 100000m)]);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.PrepareAsync(request));

        Assert.Contains(productId.ToString(), exception.Message);
    }
    [Fact]
    public async Task Rounds_line_total_to_two_decimal_places()
    {
        var productId = Guid.NewGuid();
        var catalog = new FakeCatalog(
            new ProductOrderSnapshot(
                productId, "SKU-ROUND", "Sản phẩm cân", 1m));

        var service = new OrderPreparationService(catalog);

        var request = new CreateOrderRequest(
            "test-rounding",
            "ORDER-003",
            null,
            Guid.NewGuid(),
            0m,
            0m,
            [new CreateOrderLineRequest(productId, 0.125m, 10.12m)]);

        var prepared = await service.PrepareAsync(request);

        var line = Assert.Single(prepared.Items);
        Assert.Equal(1.27m, line.LineTotal);
    }
    [Fact]
    public async Task Calculates_total_from_items_tax_and_shipping()
    {
        var productId = Guid.NewGuid();
        var catalog = new FakeCatalog(
            new ProductOrderSnapshot(
                productId, "SKU-TOTAL", "Sản phẩm thử", 60000m));

        var service = new OrderPreparationService(catalog);

        var request = new CreateOrderRequest(
            "test-order-total",
            "ORDER-004",
            null,
            Guid.NewGuid(),
            10000m,
            30000m,
            [new CreateOrderLineRequest(productId, 2m, 100000m)]);

        var prepared = await service.PrepareAsync(request);

        Assert.Equal(200000m, prepared.Subtotal);
        Assert.Equal(10000m, prepared.Tax);
        Assert.Equal(30000m, prepared.ShippingFee);
        Assert.Equal(240000m, prepared.Total);
    }
    [Fact]
    public async Task Rejects_total_exceeding_database_limit()
    {
        var productId = Guid.NewGuid();
        var catalog = new FakeCatalog(
            new ProductOrderSnapshot(
                productId, "SKU-LIMIT", "Sản phẩm thử", 1m));

        var service = new OrderPreparationService(catalog);

        var request = new CreateOrderRequest(
            "test-total-limit",
            "ORDER-005",
            null,
            Guid.NewGuid(),
            0m,
            1m,
            [new CreateOrderLineRequest(
            productId, 1m, 999999999999m)]);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.PrepareAsync(request));
    }
    private sealed class FakeCatalog(
        params ProductOrderSnapshot[] products) : IProductCatalogContract
    {
        public Task<IReadOnlyList<ProductOrderSnapshot>> GetActiveProductsAsync(
            IReadOnlyList<Guid> productIds,
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<ProductOrderSnapshot> result = products
                .Where(product => productIds.Contains(product.Id))
                .ToArray();

            return Task.FromResult(result);
        }
    }
}
