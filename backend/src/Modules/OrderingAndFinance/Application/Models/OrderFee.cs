namespace NexusOMS.OrderingAndFinance;

public sealed record OrderFee(
    Guid Id,
    Guid OrderId,
    string FeeType,
    decimal Amount);
