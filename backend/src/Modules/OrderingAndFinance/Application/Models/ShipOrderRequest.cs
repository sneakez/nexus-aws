namespace NexusOMS.OrderingAndFinance;

public sealed record ShipOrderRequest(
    string IdempotencyKey);
