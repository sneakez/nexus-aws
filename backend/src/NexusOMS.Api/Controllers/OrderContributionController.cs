using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/orders/{orderId:guid}/contribution")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class OrderContributionController(
    OrderContributionService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<OrderContributionReport>> Get(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var result = await service.GetAsync(
            orderId, cancellationToken);

        return result is null ? NotFound() : Ok(result);
    }
}
