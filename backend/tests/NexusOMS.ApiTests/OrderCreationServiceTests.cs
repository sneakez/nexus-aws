using NexusOMS.Contracts;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class OrderCreationServiceTests
{
    [Fact]
    public async Task Replay_returns_existing_order_without_reading_catalog()
    {
        var order = new OrderDetail(
            Guid.NewGuid(),
            "ORDER-REPLAY",
            "pending",
            null,
            100000m,
            0m,
            0m,
            100000m,
            DateTimeOffset.UtcNow,
            []);

        var expected = new CreateOrderResult(order, true);
        var repository = new ReplayRepository(expected);

        var service = new OrderCreationService(
            new OrderPreparationService(new UnavailableCatalog()),
            repository);

        var request = new CreateOrderRequest(
            "replay-key",
            "ORDER-REPLAY",
            null,
            Guid.NewGuid(),
            0m,
            0m,
            [new CreateOrderLineRequest(Guid.NewGuid(), 1m, 100000m)]);

        var result = await service.CreateAsync(
            request, Guid.NewGuid());

        Assert.Same(expected, result);
        Assert.True(result.Replayed);
    }

    private sealed class UnavailableCatalog : IProductCatalogContract
    {
        public Task<IReadOnlyList<ProductOrderSnapshot>> GetActiveProductsAsync(
            IReadOnlyList<Guid> productIds,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException(
                "Không được đọc catalog khi trả lại đơn đã tạo.");
    }

    private sealed class ReplayRepository(
        CreateOrderResult existing) : IOrderCreationRepository
    {
        public Task<CreateOrderResult?> FindReplayAsync(
            CreateOrderRequest request,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<CreateOrderResult?>(existing);

        public Task<CreateOrderResult> CreateAsync(
            CreateOrderRequest request,
            PreparedOrder prepared,
            Guid actorId,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException(
                "Không được tạo lại đơn đã tồn tại.");
    }
}
