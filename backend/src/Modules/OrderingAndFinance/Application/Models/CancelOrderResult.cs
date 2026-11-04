namespace NexusOMS.OrderingAndFinance;

public sealed record CancelOrderResult(
    Guid OrderId,
    string Status,
    bool Replayed);
