namespace NexusOMS.OrderingAndFinance;

public sealed record ReturnLine(
    Guid OrderItemId,
    decimal Quantity);
