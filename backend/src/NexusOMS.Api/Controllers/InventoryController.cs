using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/inventory")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class InventoryController(InventoryService inventory) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<InventoryItem>> List([FromQuery] Guid? warehouseId, [FromQuery] Guid? productId, CancellationToken cancellationToken) =>
        inventory.ListAsync(warehouseId, productId, cancellationToken);

    [HttpGet("transactions")]
    public Task<IReadOnlyList<StockTransaction>> ListTransactions([FromQuery] Guid? warehouseId, [FromQuery] Guid? productId, [FromQuery] string? type, CancellationToken cancellationToken) =>
        inventory.ListTransactionsAsync(warehouseId, productId, type, cancellationToken);

    [HttpPost("receipts")]
    public Task<ActionResult<InventoryChangeResult>> Receive(InventoryChangeRequest request, CancellationToken cancellationToken) =>
        Change(request, true, cancellationToken);

    [HttpPost("adjustments")]
    public Task<ActionResult<InventoryChangeResult>> Adjust(InventoryChangeRequest request, CancellationToken cancellationToken) =>
        Change(request, false, cancellationToken);

    private async Task<ActionResult<InventoryChangeResult>> Change(InventoryChangeRequest request, bool isReceipt, CancellationToken cancellationToken)
    {
        try
        {
            var result = isReceipt
                ? await inventory.ReceiveAsync(request.WarehouseId, request.ProductId, request.Quantity, request.IdempotencyKey, cancellationToken)
                : await inventory.AdjustAsync(request.WarehouseId, request.ProductId, request.Quantity, request.IdempotencyKey, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException exception) { return BadRequest(new { message = exception.Message }); }
        catch (DuplicateStockOperationException) { return Conflict(new { message = "Idempotency key has already been used." }); }
        catch (InsufficientStockException) { return Conflict(new { message = "Stock cannot fall below reserved quantity, or warehouse/product does not exist." }); }
    }
}

public sealed record InventoryChangeRequest(Guid WarehouseId, Guid ProductId, decimal Quantity, string? IdempotencyKey);
