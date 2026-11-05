namespace NexusOMS.OrderingAndFinance;

public sealed record CreateOrderLineRequest(
    Guid ProductId,
    decimal Quantity,
    decimal UnitPrice);

public sealed record CreateOrderRequest(
    string IdempotencyKey,
    string OrderNumber,
    Guid? CustomerId,
    Guid WarehouseId,
    decimal Tax,
    decimal ShippingFee,
    IReadOnlyList<CreateOrderLineRequest> Items,
    Guid? ChannelConnectionId = null);
