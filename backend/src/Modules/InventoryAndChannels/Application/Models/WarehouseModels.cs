namespace NexusOMS.InventoryAndChannels;

public sealed record Warehouse(
    Guid Id,
    string Code,
    string Name,
    string? Address,
    int Priority,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
