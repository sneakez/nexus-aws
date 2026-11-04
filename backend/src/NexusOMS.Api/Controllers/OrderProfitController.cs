using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/orders/{orderId:guid}/profit-estimate")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class OrderProfitController(
    OrderProfitService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<OrderProfitEstimate>> Get(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var result = await service.GetAsync(
            orderId, cancellationToken);

        return result is null ? NotFound() : Ok(result);
    }
}
