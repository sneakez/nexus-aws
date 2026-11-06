using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/finance-summary")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class FinanceSummaryController(IFinanceSummaryRepository finance) : ControllerBase
{
    [HttpGet("sku")]
    public Task<IReadOnlyList<FinanceSummaryRow>> BySku(CancellationToken cancellationToken) =>
        finance.ListAsync(false, cancellationToken);

    [HttpGet("channels")]
    public Task<IReadOnlyList<FinanceSummaryRow>> ByChannel(CancellationToken cancellationToken) =>
        finance.ListAsync(true, cancellationToken);

    [HttpGet("timeline")]
    public Task<IReadOnlyList<FinanceTimelineRow>> Timeline(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        CancellationToken cancellationToken) =>
        finance.ListTimelineAsync(from, to, cancellationToken);
}
