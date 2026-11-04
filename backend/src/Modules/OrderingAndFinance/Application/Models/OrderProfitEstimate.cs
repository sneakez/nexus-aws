namespace NexusOMS.OrderingAndFinance;

public sealed record OrderProfitEstimate(
    Guid OrderId,
    decimal Revenue,
    decimal? CostOfGoods,
    decimal TotalFees,
    decimal? EstimatedProfit,
    bool HasCompleteCost);
