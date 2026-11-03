using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Npgsql;
namespace NexusOMS.Api.Authorization;

public sealed class ProfileClaimsTransformation(
    NpgsqlDataSource dataSource) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(
        ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return principal;

        // Không tin role ứng dụng có sẵn trong token.
        var result = principal.Clone();

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

        const string sql = """
            select role::text
            from public.profiles
            where id = @id and is_active = true
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", userId);

        var role = await command.ExecuteScalarAsync() as string;

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
