namespace NexusOMS.OrderingAndFinance;

public sealed record JournalDetail(
    Guid Id,
    string EntryNumber,
    string? EventSource,
    Guid? ReferenceId,
    DateTimeOffset PostedAt,
    IReadOnlyList<JournalLine> Lines);

public sealed record CreateJournalResult(
    JournalDetail Journal,
    bool Replayed);
