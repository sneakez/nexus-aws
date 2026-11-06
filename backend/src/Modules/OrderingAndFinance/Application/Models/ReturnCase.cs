namespace NexusOMS.OrderingAndFinance;

public sealed record ReturnCase(
    Guid Id,
    Guid OrderId,
    string Status,
    string? Reason,
    IReadOnlyList<ReturnLine> Items);

public sealed record ReturnCaseSummary(
    Guid Id,
    string Status,
    string? Reason,
    DateTimeOffset CreatedAt,
    Guid OrderId,
    string OrderNumber,
    string OrderStatus,
    string? CustomerName,
    Guid? ChannelConnectionId,
    string? ChannelName);
