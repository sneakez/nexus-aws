using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;
using System.Security.Claims;
namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/orders/{orderId:guid}/fees")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class OrderFeesController(OrderFeeService fees)
    : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<OrderFee>> List(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        return fees.ListAsync(orderId, cancellationToken);
    }
    [HttpPost]
    public async Task<ActionResult<OrderFee>> Create(
    Guid orderId,
    CreateOrderFeeRequest request,
    CancellationToken cancellationToken)
    {
        var userId = User.FindFirst("sub")?.Value
    ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(userId, out var actorId))
            return Unauthorized();
        try
        {
            var fee = new OrderFee(
                request.Id,
                orderId,
                request.FeeType,
                request.Amount);

            var created = await fees.CreateAsync(
     fee,
     actorId,
     cancellationToken);

            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (FeeAlreadyExistsException exception)
        {
            return Conflict(new { message = exception.Message });
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }
    public sealed record CreateOrderFeeRequest(
    Guid Id,
    string FeeType,
    decimal Amount);
}
