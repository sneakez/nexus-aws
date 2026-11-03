using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
namespace NexusOMS.Api.Authorization;

public sealed class ProfileClaimsTransformation(
    IProfileRoleReader profiles) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(
        ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return principal;

        // Không tin role ứng dụng có sẵn trong token.
        var result = new ClaimsPrincipal(
            principal.Identities.Select(identity => identity.Clone()));

        foreach (var identity in result.Identities)
        {
            foreach (var claim in identity.FindAll("app_role").ToArray())
                identity.RemoveClaim(claim);
        }

        var userIdValue =
            result.FindFirst("sub")?.Value
            ?? result.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(userIdValue, out var userId))
            return result;

        var role = await profiles.GetActiveRoleAsync(userId);

        if (role is not ("admin" or "manager" or "warehouse"))
            return result;

        var roleIdentity = new ClaimsIdentity(
            authenticationType: "Profile",
            nameType: ClaimTypes.Name,
            roleType: "app_role");

        roleIdentity.AddClaim(new Claim("app_role", role));
        result.AddIdentity(roleIdentity);

        return result;
    }
}
