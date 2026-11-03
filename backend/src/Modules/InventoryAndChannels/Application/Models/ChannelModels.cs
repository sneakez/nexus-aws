namespace NexusOMS.InventoryAndChannels;

public sealed record ChannelConnection(Guid Id, string Type, string AccountName, string Status, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record ChannelSkuMapping(Guid Id, Guid ChannelConnectionId, Guid ProductId, string ProductSku, string ProductName, string ChannelSku, DateTimeOffset CreatedAt);
