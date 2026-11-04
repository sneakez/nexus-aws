namespace NexusOMS.OrderingAndFinance;

public sealed record JournalLine(
    Guid AccountId,
    decimal DebitAmount,
    decimal CreditAmount);
