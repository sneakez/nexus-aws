using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.Api.Integration;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/webhook-simulator")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class WebhookSimulatorDispatchController(WebhookSimulatorService simulator) : ControllerBase
{
    [HttpPost("{connectionId:guid}/dispatch")]
    public async Task<IActionResult> Dispatch(Guid connectionId, WebhookSimulatorPayload payload, CancellationToken cancellationToken)
    {
        try
        {
            var result = await simulator.ProcessTrustedAsync(connectionId, payload, cancellationToken);
            return result.Replayed ? Ok(result) : Accepted(result);
        }
        catch (WebhookPayloadConflictException) { return Conflict(new { message = "eventId đã được dùng với payload khác." }); }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (InvalidOperationException exception) { return BadRequest(new { message = exception.Message }); }
        catch (WebhookInventoryUnavailableException exception) { return Conflict(new { message = exception.Message }); }
        catch (InsufficientStockException) { return Conflict(new { message = "Tồn kho vừa thay đổi và không còn đủ để giữ hàng. Tải lại tồn kho rồi thử lại." }); }
        catch (Exception exception) when (exception is OrderCreationConflictException
            or InventoryOperationConflictException or OrderTransitionConflictException)
        { return Conflict(new { message = exception.Message }); }
    }
}
