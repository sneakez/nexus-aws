namespace NexusOMS.InventoryAndChannels;

public enum ActivityStatus { Active, Inactive, All }

public static class ActivityStatusParser
{
    public static bool TryParse(string? value, out ActivityStatus status)
    {
        switch (value?.Trim().ToLowerInvariant())
        {
            case null or "" or "active": status = ActivityStatus.Active; return true;
            case "inactive": status = ActivityStatus.Inactive; return true;
            case "all": status = ActivityStatus.All; return true;
            default: status = default; return false;
        }
    }
}
