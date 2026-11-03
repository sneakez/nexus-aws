namespace NexusOMS.OrderingAndFinance;

public sealed record OrderStatusEntry(
    Guid Id, string? FromStatus, string ToStatus, string? Note,
    Guid? CreatedBy, DateTimeOffset CreatedAt);
