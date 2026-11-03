namespace NexusOMS.OrderingAndFinance;

// Customer use-case response model.

public sealed record Customer(
    Guid Id,
    string? Name,
    string? Phone,
    string? Email);
