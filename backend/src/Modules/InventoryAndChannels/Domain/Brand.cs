namespace NexusOMS.InventoryAndChannels;

public sealed record Brand(Guid Id, string Name, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public static class BrandName
{
    public static string Normalize(string? value)
    {
        var name = value?.Trim() ?? string.Empty;
        if (name.Length is 0 or > 120)
            throw new ArgumentException("Brand name must contain 1 to 120 characters.");

        return name;
    }
}

public sealed class BrandAlreadyExistsException : Exception;
