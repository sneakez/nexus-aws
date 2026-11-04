namespace NexusOMS.OrderingAndFinance;

public sealed record PreparedOrderLine(
    Guid ProductId,
    string ProductSku,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal UnitCost,
    decimal LineTotal);
