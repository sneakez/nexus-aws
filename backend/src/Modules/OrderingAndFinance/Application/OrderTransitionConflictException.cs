namespace NexusOMS.OrderingAndFinance;

public sealed class OrderTransitionConflictException(string message)
    : Exception(message);
