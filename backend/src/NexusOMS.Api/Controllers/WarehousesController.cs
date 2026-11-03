using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/warehouses")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class WarehousesController(WarehouseService warehouses) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Warehouse>>> List([FromQuery] string? status, CancellationToken cancellationToken)
    {
        if (!ActivityStatusParser.TryParse(status, out var activityStatus))
            return BadRequest(new { message = "status must be active, inactive, or all." });

        return Ok(await warehouses.ListAsync(activityStatus, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Warehouse>> Get(Guid id, CancellationToken cancellationToken) =>
        await warehouses.GetAsync(id, cancellationToken) is { } warehouse ? Ok(warehouse) : NotFound();

    [HttpPost]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<Warehouse>> Create(WarehouseRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetInput(request.Code, request.Name, request.Address, request.Priority, out var input, out var error)) return error!;

        try
        {
            var warehouse = await warehouses.CreateAsync(input!, cancellationToken);
            return CreatedAtAction(nameof(Get), new { warehouse.Id }, warehouse);
        }
        catch (WarehouseCodeAlreadyExistsException)
        {
            return Conflict(new { message = "Warehouse code already exists." });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<Warehouse>> Update(Guid id, UpdateWarehouseRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetInput(request.Code, request.Name, request.Address, request.Priority, out var input, out var error)) return error!;

        try
        {
            return await warehouses.UpdateAsync(id, input!, request.IsActive, cancellationToken) is { } warehouse
                ? Ok(warehouse)
                : NotFound();
        }
        catch (WarehouseCodeAlreadyExistsException)
        {
            return Conflict(new { message = "Warehouse code already exists." });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken) =>
        await warehouses.DeactivateAsync(id, cancellationToken) ? NoContent() : NotFound();

    private static bool TryGetInput(string? code, string? name, string? address, int priority, out WarehouseInput? input, out ActionResult? error)
    {
        try
        {
            input = WarehouseInput.Normalize(code, name, address, priority);
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

public sealed record WarehouseRequest(string? Code, string? Name, string? Address, int Priority);
public sealed record UpdateWarehouseRequest(string? Code, string? Name, string? Address, int Priority, bool IsActive);
