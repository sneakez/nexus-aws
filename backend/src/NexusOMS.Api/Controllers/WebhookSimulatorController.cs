using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Integration;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/webhooks/simulator")]
[AllowAnonymous]
public sealed class WebhookSimulatorController(WebhookSimulatorService simulator) : ControllerBase
{
    [HttpPost("{connectionId:guid}")]
    public async Task<IActionResult> Receive(Guid connectionId, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync(cancellationToken);
        try
        {
            var result = await simulator.ProcessAsync(
                connectionId, rawBody, Request.Headers["X-Nexus-Signature"].FirstOrDefault(), cancellationToken);
            return result.Replayed ? Ok(result) : Accepted(result);
        }
        catch (WebhookSignatureException) { return Unauthorized(new { message = "Webhook signature không hợp lệ." }); }
        catch (WebhookPayloadConflictException) { return Conflict(new { message = "eventId đã được dùng với payload khác." }); }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (Exception exception) when (exception is OrderCreationConflictException
            or InventoryOperationConflictException or InsufficientStockException)
        { return Conflict(new { message = "Không thể tạo Order từ webhook do trùng dữ liệu hoặc không đủ tồn." }); }
    }
}
