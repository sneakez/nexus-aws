namespace NexusOMS.InventoryAndChannels;

public sealed record WarehouseBinInput(string Code)
{
    public static WarehouseBinInput Normalize(string? code)
    {
        var normalizedCode = code?.Trim().ToUpperInvariant() ?? string.Empty;
        if (normalizedCode.Length is 0 or > 50)
            throw new ArgumentException("Bin code must contain 1 to 50 characters.");

        return new WarehouseBinInput(normalizedCode);
    }
}

public sealed class WarehouseBinAlreadyExistsException : Exception;
