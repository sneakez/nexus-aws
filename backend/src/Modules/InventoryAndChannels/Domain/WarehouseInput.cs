namespace NexusOMS.InventoryAndChannels;

public sealed record WarehouseInput(string Code, string Name, string? Address, int Priority)
{
    public static WarehouseInput Normalize(string? code, string? name, string? address, int priority)
    {
        var normalizedCode = code?.Trim().ToUpperInvariant() ?? string.Empty;
        var normalizedName = name?.Trim() ?? string.Empty;
        var normalizedAddress = string.IsNullOrWhiteSpace(address) ? null : address.Trim();

        if (normalizedCode.Length is 0 or > 50)
            throw new ArgumentException("Warehouse code must contain 1 to 50 characters.");
        if (normalizedName.Length is 0 or > 255)
            throw new ArgumentException("Warehouse name must contain 1 to 255 characters.");
        if (normalizedAddress?.Length > 500)
            throw new ArgumentException("Warehouse address cannot exceed 500 characters.");
        if (priority < 0)
            throw new ArgumentException("Warehouse priority cannot be negative.");

        return new WarehouseInput(normalizedCode, normalizedName, normalizedAddress, priority);
    }
}

public sealed class WarehouseCodeAlreadyExistsException : Exception;
