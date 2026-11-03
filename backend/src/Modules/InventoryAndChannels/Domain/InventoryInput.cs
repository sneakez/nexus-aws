namespace NexusOMS.InventoryAndChannels;

public static class InventoryInput
{
    public static decimal PositiveQuantity(decimal quantity)
    {
        if (quantity <= 0) throw new ArgumentException("Quantity must be greater than zero.");
        return quantity;
    }

    public static decimal AdjustmentQuantity(decimal quantityDelta)
    {
        if (quantityDelta == 0) throw new ArgumentException("Quantity delta cannot be zero.");
        return quantityDelta;
    }
}

public sealed class DuplicateStockOperationException : Exception;
public sealed class InsufficientStockException : Exception;
