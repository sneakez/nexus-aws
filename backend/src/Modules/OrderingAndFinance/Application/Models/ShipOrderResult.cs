namespace NexusOMS.OrderingAndFinance;

public sealed record ShipOrderResult(
    Guid OrderId,
    string Status,
    bool Replayed);
