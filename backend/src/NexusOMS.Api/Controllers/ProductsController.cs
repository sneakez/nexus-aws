using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/products")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class ProductsController(ProductService products) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Product>>> List([FromQuery] string? status, CancellationToken cancellationToken)
    {
        if (!ActivityStatusParser.TryParse(status, out var activityStatus))
            return BadRequest(new { message = "status must be active, inactive, or all." });

        return Ok(await products.ListAsync(activityStatus, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Product>> Get(Guid id, CancellationToken cancellationToken) =>
        await products.GetAsync(id, cancellationToken) is { } product ? Ok(product) : NotFound();

    [HttpPost]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<Product>> Create(CreateProductRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetInput(request.Sku, request.Name, request.CostPrice, out var input, out var error)) return error!;

        try
        {
            var product = await products.CreateAsync(request.BrandId, input!, cancellationToken);
            return CreatedAtAction(nameof(Get), new { product.Id }, product);
        }
        catch (BrandNotFoundException)
        {
            return NotFound(new { message = "Brand not found." });
        }
        catch (ProductSkuAlreadyExistsException)
        {
            return Conflict(new { message = "SKU already exists." });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<Product>> Update(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetInput(request.Sku, request.Name, request.CostPrice, out var input, out var error)) return error!;

        try
        {
            return await products.UpdateAsync(id, request.BrandId, input!, request.IsActive, cancellationToken) is { } product
                ? Ok(product)
                : NotFound();
        }
        catch (BrandNotFoundException)
        {
            return NotFound(new { message = "Brand not found." });
        }
        catch (ProductSkuAlreadyExistsException)
        {
            return Conflict(new { message = "SKU already exists." });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken) =>
        await products.DeactivateAsync(id, cancellationToken) ? NoContent() : NotFound();

    private static bool TryGetInput(string? sku, string? name, decimal costPrice, out ProductInput? input, out ActionResult? error)
    {
        try
        {
            input = ProductInput.Normalize(sku, name, costPrice);
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

public sealed record CreateProductRequest(Guid? BrandId, string? Sku, string? Name, decimal CostPrice);
public sealed record UpdateProductRequest(Guid? BrandId, string? Sku, string? Name, decimal CostPrice, bool IsActive);
