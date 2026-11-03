namespace NexusOMS.InventoryAndChannels;

public sealed record WarehouseBin(Guid Id, Guid WarehouseId, string Code, DateTimeOffset CreatedAt);
