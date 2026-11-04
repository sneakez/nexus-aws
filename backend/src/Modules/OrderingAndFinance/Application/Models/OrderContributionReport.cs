namespace NexusOMS.OrderingAndFinance;

public sealed record OrderContributionReport(
    Guid OrderId,
    decimal Revenue,
    decimal? CostOfGoods,
    decimal OperatingFees,
    decimal AdvertisingFees,
    decimal? Cm1,
    decimal? Cm2,
    decimal? Cm3,
    bool HasCompleteCost);
