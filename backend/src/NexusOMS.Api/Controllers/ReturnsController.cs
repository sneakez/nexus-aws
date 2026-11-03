using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;
using System.Security.Claims;
namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/returns")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class ReturnsController(ReturnService returns)
    : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReturnCase>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await returns.GetAsync(id, cancellationToken);

        if (result is null)
            return NotFound();

        return Ok(result);
    }
    [HttpPost]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<ReturnCase>> Create(
    CreateReturnRequest request,
    CancellationToken cancellationToken)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(userId, out var actorId))
            return Unauthorized();

        try
        {

            var result = await returns.CreateAsync(
    request,
    actorId,
    cancellationToken);

            if (result.Replayed)
                return Ok(result.Return);

            return CreatedAtAction(
                nameof(Get),
                new { id = result.Return.Id },
                result.Return);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (ReturnConflictException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }
}
