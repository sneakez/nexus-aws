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
}
