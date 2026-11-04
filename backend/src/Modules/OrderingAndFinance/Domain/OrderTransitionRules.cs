namespace NexusOMS.OrderingAndFinance;

public static class OrderTransitionRules
{
    public static bool CanCancel(string status) =>
        status is "pending" or "confirmed" or "processing";

    public static bool CanShip(string status) =>
        status is "processing";
}
