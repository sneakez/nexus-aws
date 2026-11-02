using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace NexusOMS.Api.Controllers;

[ApiController]
[Route("api/v1/session")]
public sealed class SessionController : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() => Ok(new
    {
        userId = User.Identity?.Name,
        roles = User.Claims.Where(claim => claim.Type is "app_role" or "role").Select(claim => claim.Value),
    });
}
