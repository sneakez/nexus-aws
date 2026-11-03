using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/channel-connections")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class ChannelConnectionsController(ChannelService channels) : ControllerBase
{
    [HttpGet] public Task<IReadOnlyList<ChannelConnection>> List(CancellationToken cancellationToken) => channels.ListConnectionsAsync(cancellationToken);
    [HttpGet("{id:guid}")] public async Task<ActionResult<ChannelConnection>> Get(Guid id, CancellationToken cancellationToken) => await channels.GetConnectionAsync(id, cancellationToken) is { } connection ? Ok(connection) : NotFound();
    [HttpPost] public async Task<ActionResult<ChannelConnection>> Create(ChannelConnectionRequest request, CancellationToken cancellationToken)
    {
        try { var connection = await channels.CreateConnectionAsync(ChannelConnectionInput.Normalize(request.Type, request.AccountName, "connected"), cancellationToken); return CreatedAtAction(nameof(Get), new { id = connection.Id }, connection); }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (ChannelConnectionAlreadyExistsException) { return Conflict(new { message = "Channel account already exists." }); }
    }
    [HttpPut("{id:guid}")] public async Task<ActionResult<ChannelConnection>> Update(Guid id, UpdateChannelConnectionRequest request, CancellationToken cancellationToken)
    {
        try { return await channels.UpdateConnectionAsync(id, ChannelConnectionInput.Normalize(request.Type, request.AccountName, request.Status), cancellationToken) is { } connection ? Ok(connection) : NotFound(); }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (ChannelConnectionAlreadyExistsException) { return Conflict(new { message = "Channel account already exists." }); }
    }
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) => await channels.DeleteConnectionAsync(id, cancellationToken) ? NoContent() : NotFound();
    [HttpGet("{connectionId:guid}/sku-mappings")] public Task<IReadOnlyList<ChannelSkuMapping>> ListMappings(Guid connectionId, CancellationToken cancellationToken) => channels.ListMappingsAsync(connectionId, cancellationToken);
    [HttpPost("{connectionId:guid}/sku-mappings")] public async Task<ActionResult<ChannelSkuMapping>> CreateMapping(Guid connectionId, ChannelSkuMappingRequest request, CancellationToken cancellationToken)
    {
        try { var mapping = await channels.CreateMappingAsync(connectionId, ChannelSkuMappingInput.Normalize(request.ProductId, request.ChannelSku), cancellationToken); return CreatedAtAction(nameof(ListMappings), new { connectionId }, mapping); }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (ChannelConnectionNotFoundException) { return NotFound(new { message = "Channel connection or product not found." }); }
        catch (ChannelSkuMappingAlreadyExistsException) { return Conflict(new { message = "Channel SKU already exists in this connection." }); }
    }
    [HttpDelete("{connectionId:guid}/sku-mappings/{id:guid}")] public async Task<IActionResult> DeleteMapping(Guid connectionId, Guid id, CancellationToken cancellationToken) => await channels.DeleteMappingAsync(connectionId, id, cancellationToken) ? NoContent() : NotFound();
}

public sealed record ChannelConnectionRequest(string? Type, string? AccountName);
public sealed record UpdateChannelConnectionRequest(string? Type, string? AccountName, string? Status);
public sealed record ChannelSkuMappingRequest(Guid ProductId, string? ChannelSku);
