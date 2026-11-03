namespace NexusOMS.InventoryAndChannels;

public sealed record InventoryItem(
    Guid Id, Guid WarehouseId, string WarehouseCode, Guid ProductId, string ProductSku, string ProductName,
    Guid? BinId, string? BinCode, decimal Stock, decimal Reserved, decimal PendingQc, decimal Incoming,
    decimal Available, DateTimeOffset UpdatedAt);

public sealed record StockTransaction(
    Guid Id, Guid WarehouseId, Guid ProductId, string Type, decimal QuantityDelta, string? ReferenceType,
    Guid? ReferenceId, string? IdempotencyKey, DateTimeOffset CreatedAt);

public sealed record InventoryChangeResult(InventoryItem Item, Guid TransactionId);
