namespace NexusOMS.OrderingAndFinance;

public sealed record OrderProgressRequest(string IdempotencyKey);
public sealed record OrderProgressResult(Guid OrderId, string Status, bool Replayed);
