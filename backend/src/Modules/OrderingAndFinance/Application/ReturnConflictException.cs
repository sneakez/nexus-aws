namespace NexusOMS.OrderingAndFinance;

public sealed class ReturnConflictException(string message)
    : Exception(message);
