using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/orders")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class OrdersController(OrderService orders)
    : ControllerBase
{
    [HttpGet("{id:guid}/history")]
    public async Task<ActionResult<IReadOnlyList<OrderStatusEntry>>> History(
        Guid id, CancellationToken cancellationToken)
    {
        var history = await orders.GetHistoryAsync(id, cancellationToken);
        return history is null ? NotFound() : Ok(history);
    }
    [HttpGet]
    public Task<IReadOnlyList<OrderSummary>> List(
        CancellationToken cancellationToken)
    {
        return orders.ListAsync(cancellationToken);
    }
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDetail>> Get(
    Guid id,
    CancellationToken cancellationToken)
    {
        var order = await orders.GetAsync(id, cancellationToken);

        if (order is null)
            return NotFound();

        return Ok(order);
    }
}
