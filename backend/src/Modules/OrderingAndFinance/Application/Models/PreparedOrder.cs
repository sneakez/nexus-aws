namespace NexusOMS.OrderingAndFinance;

public sealed record PreparedOrder(
    decimal Subtotal,
    decimal Tax,
    decimal ShippingFee,
    decimal Total,
    IReadOnlyList<PreparedOrderLine> Items);
