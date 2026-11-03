using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class CustomersController(CustomerService customers)
    : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<Customer>> List(
        CancellationToken cancellationToken)
    {
        return customers.ListAsync(cancellationToken);
    }
    [HttpPost]
    public async Task<ActionResult<Customer>> Create(
    CreateCustomerRequest request,
    CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();

        if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
        {
            return BadRequest(new
            {
                message = "Tên khách hàng phải có từ 1 đến 120 ký tự."
            });
        }

        var phone = string.IsNullOrWhiteSpace(request.Phone)
            ? null
            : request.Phone.Trim();

        var email = string.IsNullOrWhiteSpace(request.Email)
            ? null
            : request.Email.Trim();

        var customer = await customers.CreateAsync(
            name,
            phone,
            email,
            cancellationToken);

        return StatusCode(StatusCodes.Status201Created, customer);
    }
    public sealed record CreateCustomerRequest(
    string? Name,
    string? Phone,
    string? Email);
}
