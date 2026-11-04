using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.Api.Infrastructure;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/orders")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
[ServiceFilter(typeof(OrderWorkflowExceptionFilter))]
public sealed class OrderCommandsController(
    OrderCreationService creation,
    OrderCancellationService cancellation,
    OrderShippingService shipping,
    OrderProgressService progress) : ControllerBase
{
    private bool TryGetActor(out Guid actorId) => Guid.TryParse(
        User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier), out actorId)
        && actorId != Guid.Empty;

    [HttpPost]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<OrderDetail>> Create(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor)) return Unauthorized();
        var result = await creation.CreateAsync(request, actor, cancellationToken);
        if (result.Replayed) return Ok(result.Order);
        return CreatedAtAction(nameof(OrdersController.Get), "Orders", new { id = result.Order.Id }, result.Order);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<CancelOrderResult>> Cancel(Guid id, CancelOrderRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor)) return Unauthorized();
        var result = await cancellation.CancelAsync(id, request, actor, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/ship")]
    public async Task<ActionResult<ShipOrderResult>> Ship(Guid id, ShipOrderRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor)) return Unauthorized();
        var result = await shipping.ShipAsync(id, request, actor, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public Task<IActionResult> Confirm(Guid id, OrderProgressRequest request, CancellationToken cancellationToken) =>
        Advance(id, "confirm", request, cancellationToken);

    [HttpPost("{id:guid}/process")]
    public Task<IActionResult> Process(Guid id, OrderProgressRequest request, CancellationToken cancellationToken) =>
        Advance(id, "process", request, cancellationToken);

    private async Task<IActionResult> Advance(Guid id, string operation, OrderProgressRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actor)) return Unauthorized();
        var result = await progress.AdvanceAsync(id, operation, request, actor, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
