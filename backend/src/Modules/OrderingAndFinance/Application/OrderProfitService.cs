namespace NexusOMS.OrderingAndFinance;

public sealed class OrderProfitService(
    IOrderRepository orders,
    IOrderFeeRepository fees)
{
    public async Task<OrderProfitEstimate?> GetAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(orderId, cancellationToken);
        if (order is null)
            return null;

        var orderFees = await fees.ListAsync(orderId, cancellationToken);

        var hasCompleteCost = order.Items.Count > 0
            && order.Items.All(item => item.UnitCost.HasValue);

        decimal? costOfGoods = hasCompleteCost
            ? order.Items.Sum(item => item.Quantity * item.UnitCost!.Value)
            : null;

        var revenue = order.Subtotal + order.ShippingFee;
        var totalFees = orderFees.Sum(fee => fee.Amount);

        decimal? estimatedProfit = costOfGoods.HasValue
            ? revenue - costOfGoods.Value - totalFees
            : null;

        return new OrderProfitEstimate(
            order.Id,
            revenue,
            costOfGoods,
            totalFees,
            estimatedProfit,
            hasCompleteCost);
    }
}
