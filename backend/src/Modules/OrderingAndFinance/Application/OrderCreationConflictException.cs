namespace NexusOMS.OrderingAndFinance;

public sealed class OrderCreationConflictException(string message)
    : Exception(message);
