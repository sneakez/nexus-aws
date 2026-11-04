using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/journals")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class JournalsController(
    JournalService service) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<JournalDetail>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var journal = await service.GetAsync(id, cancellationToken);

        return journal is null ? NotFound() : Ok(journal);
    }

    [HttpPost]
    public async Task<ActionResult<JournalDetail>> Create(
        CreateJournalRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue("sub")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userId, out var actorId)
            || actorId == Guid.Empty)
            return Unauthorized();

        try
        {
            var result = await service.CreateAsync(
                request, actorId, cancellationToken);

            if (result.Replayed)
                return Ok(result.Journal);

            return CreatedAtAction(
                nameof(Get),
                new { id = result.Journal.Id },
                result.Journal);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (JournalConflictException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }
}
