namespace NexusOMS.InventoryAndChannels;

public sealed record ChannelConnectionInput(string Type, string AccountName, string Status)
{
    public static ChannelConnectionInput Normalize(string? type, string? accountName, string? status)
    {
        var normalizedType = type?.Trim().ToLowerInvariant() ?? string.Empty;
        var normalizedAccountName = accountName?.Trim() ?? string.Empty;
        var normalizedStatus = status?.Trim().ToLowerInvariant() ?? string.Empty;
        if (normalizedType is not ("shopee" or "tiktok_shop" or "lazada" or "website_d2c"))
            throw new ArgumentException("Channel type is invalid.");
        if (normalizedAccountName.Length is 0 or > 120)
            throw new ArgumentException("Account name must contain 1 to 120 characters.");
        if (normalizedStatus is not ("connected" or "disconnected" or "error"))
            throw new ArgumentException("Channel status is invalid.");
        return new ChannelConnectionInput(normalizedType, normalizedAccountName, normalizedStatus);
    }
}

public sealed record ChannelSkuMappingInput(Guid ProductId, string ChannelSku)
{
    public static ChannelSkuMappingInput Normalize(Guid productId, string? channelSku)
    {
        var normalizedSku = channelSku?.Trim().ToUpperInvariant() ?? string.Empty;
        if (productId == Guid.Empty) throw new ArgumentException("Product id is required.");
        if (normalizedSku.Length is 0 or > 100) throw new ArgumentException("Channel SKU must contain 1 to 100 characters.");
        return new ChannelSkuMappingInput(productId, normalizedSku);
    }
}

public sealed class ChannelConnectionAlreadyExistsException : Exception;
public sealed class ChannelConnectionNotFoundException : Exception;
public sealed class ChannelSkuMappingAlreadyExistsException : Exception;
