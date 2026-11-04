namespace NexusOMS.OrderingAndFinance;

public sealed record CreateOrderResult(
    OrderDetail Order,
    bool Replayed);
