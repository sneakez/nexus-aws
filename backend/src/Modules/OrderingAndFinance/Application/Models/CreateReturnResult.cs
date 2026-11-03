namespace NexusOMS.OrderingAndFinance;

public sealed record CreateReturnResult(
    ReturnCase Return,
    bool Replayed);
