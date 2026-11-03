namespace NexusOMS.InventoryAndChannels;

public sealed record ProductInput(string Sku, string Name, decimal CostPrice)
{
    public static ProductInput Normalize(string? sku, string? name, decimal costPrice)
    {
        var normalizedSku = sku?.Trim().ToUpperInvariant() ?? string.Empty;
        var normalizedName = name?.Trim() ?? string.Empty;

        if (normalizedSku.Length is 0 or > 100)
            throw new ArgumentException("SKU must contain 1 to 100 characters.");
        if (normalizedName.Length is 0 or > 255)
            throw new ArgumentException("Product name must contain 1 to 255 characters.");
        if (costPrice < 0)
            throw new ArgumentException("Cost price cannot be negative.");

        return new ProductInput(normalizedSku, normalizedName, costPrice);
    }
}

public sealed class ProductSkuAlreadyExistsException : Exception;
public sealed class BrandNotFoundException : Exception;
public sealed class ProductNotFoundException : Exception;
