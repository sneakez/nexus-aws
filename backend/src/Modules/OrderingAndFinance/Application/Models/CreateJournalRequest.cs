namespace NexusOMS.OrderingAndFinance;

public sealed record CreateJournalRequest(
    Guid Id,
    string EntryNumber,
    string EventSource,
    Guid? ReferenceId,
    IReadOnlyList<JournalLine> Lines);
