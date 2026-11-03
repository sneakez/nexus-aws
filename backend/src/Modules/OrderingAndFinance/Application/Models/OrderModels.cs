namespace NexusOMS.OrderingAndFinance;

// Query response models, not domain aggregates.

public sealed record OrderSummary(
    Guid Id,
    string OrderNumber,
    string Status,
    decimal Total,
    DateTimeOffset CreatedAt);
public sealed record OrderLine(
    Guid Id,
    Guid? ProductId,
    string? ProductSku,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public sealed record OrderDetail(
    Guid Id,
    string OrderNumber,
    string Status,
    Guid? CustomerId,
    decimal Subtotal,
    decimal Tax,
    decimal ShippingFee,
    decimal Total,
    DateTimeOffset CreatedAt,
    IReadOnlyList<OrderLine> Items);
