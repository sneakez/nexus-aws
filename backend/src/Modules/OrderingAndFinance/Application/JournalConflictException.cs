namespace NexusOMS.OrderingAndFinance;

public sealed class JournalConflictException(string message)
    : Exception(message);
