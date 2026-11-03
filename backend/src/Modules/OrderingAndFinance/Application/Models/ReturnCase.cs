namespace NexusOMS.OrderingAndFinance;

public sealed record ReturnCase(
    Guid Id,
    Guid OrderId,
    string Status,
    string? Reason,
    IReadOnlyList<ReturnLine> Items);
