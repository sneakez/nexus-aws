namespace NexusOMS.OrderingAndFinance;

public sealed record CreateReturnRequest(
    Guid Id,
    Guid OrderId,
    string Reason,
    IReadOnlyList<ReturnLine> Items);
