namespace NexusOMS.InventoryAndChannels;

public sealed record Product(
    Guid Id,
    Guid? BrandId,
    string? BrandName,
    string Sku,
    string Name,
    decimal CostPrice,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
