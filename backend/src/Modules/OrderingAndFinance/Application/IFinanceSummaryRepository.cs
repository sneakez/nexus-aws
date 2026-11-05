namespace NexusOMS.OrderingAndFinance;

public sealed record FinanceSummaryRow(string Id, string Label, string OrderCount, string? Quantity,
    string Revenue, string? CostOfGoods, string? OperatingFees, string? AdvertisingFees,
    string? Cm1, string? Cm2, string? Cm3);

public interface IFinanceSummaryRepository
{
    Task<IReadOnlyList<FinanceSummaryRow>> ListAsync(bool byChannel, CancellationToken cancellationToken);
}
