using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class OrderContributionServiceTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Separates_fees_and_requires_complete_cost(
        bool hasCost)
    {
        var orderId = Guid.NewGuid();

        var order = new OrderDetail(
            orderId,
            "CM-TEST",
            "shipped",
            null,
            200000m,
            0m,
            30000m,
            230000m,
            DateTimeOffset.UtcNow,
            [
                new OrderLine(
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    "SKU-CM",
                    "Sản phẩm thử",
                    2m,
                    100000m,
                    200000m,
                    hasCost ? 60000m : null)
            ]);

        var service = new OrderContributionService(
            new FakeOrders(order),
            new FakeFees(orderId));

        var report = await service.GetAsync(orderId);

        Assert.NotNull(report);
        Assert.Equal(230000m, report.Revenue);
        Assert.Equal(10000m, report.OperatingFees);
        Assert.Equal(20000m, report.AdvertisingFees);
        Assert.Equal(hasCost, report.HasCompleteCost);

        Assert.Equal(
            hasCost ? 120000m : (decimal?)null,
            report.CostOfGoods);
        Assert.Equal(
            hasCost ? 110000m : (decimal?)null,
            report.Cm1);
        Assert.Equal(
            hasCost ? 100000m : (decimal?)null,
            report.Cm2);
        Assert.Equal(
            hasCost ? 80000m : (decimal?)null,
            report.Cm3);
    }

    private sealed class FakeOrders(OrderDetail order)
        : IOrderRepository
    {
        public Task<OrderDetail?> GetAsync(
            Guid id,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<OrderDetail?>(
                id == order.Id ? order : null);

        public Task<IReadOnlyList<OrderSummary>> ListAsync(
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<OrderSummary>>([]);

        public Task<IReadOnlyList<OrderStatusEntry>?> GetHistoryAsync(
            Guid id,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<OrderStatusEntry>?>(null);
    }

    private sealed class FakeFees(Guid orderId)
        : IOrderFeeRepository
    {
        public Task<IReadOnlyList<OrderFee>> ListAsync(
            Guid id,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<OrderFee>>(
            [
                new OrderFee(
                    Guid.NewGuid(), orderId, "commission", 10000m),
                new OrderFee(
                    Guid.NewGuid(), orderId, "ads", 20000m)
            ]);

        public Task<OrderFee> CreateAsync(
            OrderFee fee,
            Guid actorId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException(
                "Bài test này chỉ đọc phí.");
    }
}
