using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.Api.Integration;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/webhook-simulator")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class WebhookDemoController(WebhookDemoService demo) : ControllerBase
{
    [HttpGet("queue-status")]
    public Task<WebhookQueueStatus> QueueStatus(CancellationToken cancellationToken) =>
        demo.GetQueueStatusAsync(cancellationToken);

    [HttpDelete("demo-batches/{batchId:guid}")]
    public async Task<ActionResult<WebhookDemoCleanupResult>> Cleanup(
        Guid batchId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId)
            || actorId == Guid.Empty) return Unauthorized();
        try { return Ok(await demo.CleanupAsync(batchId, actorId, cancellationToken)); }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (InvalidOperationException exception) { return Conflict(new { message = exception.Message }); }
    }
}
