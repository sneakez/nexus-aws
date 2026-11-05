using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusOMS.Api.Authorization;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/ledger-accounts")]
[Authorize(Policy = Policies.ManagerOrAdmin)]
public sealed class LedgerAccountsController(LedgerAccountService service) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<LedgerAccount>> List(CancellationToken cancellationToken) =>
        service.ListAsync(cancellationToken);
}
