using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/warehouses/{warehouseId:guid}/bins")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class WarehouseBinsController(WarehouseBinService bins) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<WarehouseBin>> List(Guid warehouseId, CancellationToken cancellationToken) =>
        bins.ListAsync(warehouseId, cancellationToken);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WarehouseBin>> Get(Guid warehouseId, Guid id, CancellationToken cancellationToken) =>
        await bins.GetAsync(warehouseId, id, cancellationToken) is { } bin ? Ok(bin) : NotFound();

    [HttpPost]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<WarehouseBin>> Create(Guid warehouseId, WarehouseBinRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetInput(request, out var input, out var error)) return error!;
        try
        {
            var bin = await bins.CreateAsync(warehouseId, input!, cancellationToken);
            return CreatedAtAction(nameof(Get), new { warehouseId, id = bin.Id }, bin);
        }
        catch (WarehouseNotFoundException) { return NotFound(new { message = "Warehouse not found." }); }
        catch (WarehouseBinAlreadyExistsException) { return Conflict(new { message = "Bin code already exists in this warehouse." }); }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<WarehouseBin>> Update(Guid warehouseId, Guid id, WarehouseBinRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetInput(request, out var input, out var error)) return error!;
        try
        {
            return await bins.UpdateAsync(warehouseId, id, input!, cancellationToken) is { } bin ? Ok(bin) : NotFound();
        }
        catch (WarehouseBinAlreadyExistsException) { return Conflict(new { message = "Bin code already exists in this warehouse." }); }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<IActionResult> Delete(Guid warehouseId, Guid id, CancellationToken cancellationToken) =>
        await bins.DeleteAsync(warehouseId, id, cancellationToken) ? NoContent() : NotFound();

    private static bool TryGetInput(WarehouseBinRequest request, out WarehouseBinInput? input, out ActionResult? error)
    {
        try
        {
            input = WarehouseBinInput.Normalize(request.Code);
            error = null;
            return true;
        }
        catch (ArgumentException exception)
        {
            input = null;
            error = new BadRequestObjectResult(new { message = exception.Message });
            return false;
        }
    }
}

public sealed record WarehouseBinRequest(string? Code);
