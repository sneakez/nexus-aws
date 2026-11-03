namespace NexusOMS.OrderingAndFinance;

public sealed record Customer(
    Guid Id,
    string? Name,
    string? Phone,
    string? Email);
