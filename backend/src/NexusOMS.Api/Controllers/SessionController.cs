using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/session")]
public sealed class SessionController : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() => Ok(new
    {
        userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
        roles = User.FindAll("app_role").Select(claim => claim.Value).Distinct(),
    });
}
