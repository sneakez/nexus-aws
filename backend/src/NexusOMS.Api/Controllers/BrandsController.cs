using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/brands")]
[Authorize(Policy = Policies.WarehouseOrAbove)]
public sealed class BrandsController(BrandService brands) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<Brand>> List(CancellationToken cancellationToken) => brands.ListAsync(cancellationToken);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Brand>> Get(Guid id, CancellationToken cancellationToken) =>
        await brands.GetAsync(id, cancellationToken) is { } brand ? Ok(brand) : NotFound();

    [HttpPost]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<Brand>> Create(BrandRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetName(request, out var name, out var error)) return error!;

        try
        {
            var brand = await brands.CreateAsync(name!, cancellationToken);
            return CreatedAtAction(nameof(Get), new { brand.Id }, brand);
        }
        catch (BrandAlreadyExistsException)
        {
            return Conflict(new { message = "Brand name already exists." });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<ActionResult<Brand>> Update(Guid id, BrandRequest request, CancellationToken cancellationToken)
    {
        //Nếu không lấy được name từ request thì trả về lỗi
        if (!TryGetName(request, out var name, out var error)) return error!;

        try
        {
            return await brands.UpdateAsync(id, name!, cancellationToken) is { } brand ? Ok(brand) : NotFound();
        }
        catch (BrandAlreadyExistsException)
        {
            return Conflict(new { message = "Brand name already exists." });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.ManagerOrAdmin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
        await brands.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();

    private static bool TryGetName(BrandRequest request, out string? name, out ActionResult? error)
    {
        try
        {
            name = BrandName.Normalize(request.Name);
            error = null;
            return true;
        }
        catch (ArgumentException exception)
        {
            name = null;
            error = new BadRequestObjectResult(new { message = exception.Message });
            return false;
        }
    }
}

public sealed record BrandRequest(string? Name);
