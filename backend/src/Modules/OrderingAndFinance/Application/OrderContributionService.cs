namespace NexusOMS.OrderingAndFinance;

public sealed class OrderContributionService(
    IOrderRepository orders,
    IOrderFeeRepository fees)
{
    public async Task<OrderContributionReport?> GetAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await orders.GetAsync(orderId, cancellationToken);

        if (order is null)
            return null;

        var orderFees = await fees.ListAsync(
            orderId, cancellationToken);

        var hasCompleteCost = order.Items.Count > 0
            && order.Items.All(item => item.UnitCost.HasValue);

        decimal? costOfGoods = hasCompleteCost
            ? order.Items.Sum(item => item.Quantity * item.UnitCost!.Value)
            : null;

        var revenue = order.Subtotal + order.ShippingFee;

        var advertisingFees = orderFees
            .Where(fee => fee.FeeType == "ads")
            .Sum(fee => fee.Amount);

        var operatingFees = orderFees
            .Where(fee => fee.FeeType != "ads")
            .Sum(fee => fee.Amount);

        decimal? cm1 = revenue - costOfGoods;
        decimal? cm2 = cm1 - operatingFees;
        decimal? cm3 = cm2 - advertisingFees;

        return new OrderContributionReport(
            order.Id,
            revenue,
            costOfGoods,
            operatingFees,
            advertisingFees,
            cm1,
            cm2,
            cm3,
            hasCompleteCost);
    }
}
