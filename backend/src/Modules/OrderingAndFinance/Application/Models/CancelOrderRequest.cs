namespace NexusOMS.OrderingAndFinance;

public sealed record CancelOrderRequest(
    string IdempotencyKey,
    string Reason);
