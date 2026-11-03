using System.Security.Claims;
using NexusOMS.Api.Authorization;

namespace NexusOMS.ApiTests;

public class ProfileClaimsTests
{
    [Theory]
    [InlineData("manager")]
    [InlineData("warehouse")]
    [InlineData(null)]
    public async Task Database_role_replaces_token_role_without_mutating_original(string? role)
    {
        var id = Guid.NewGuid();
        var reader = new ProfileReader(id, role);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("sub", id.ToString()), new Claim("app_role", "admin")], "jwt", "sub", "app_role"));
        var result = await new ProfileClaimsTransformation(reader).TransformAsync(principal);
        Assert.True(principal.IsInRole("admin"));
        Assert.False(result.IsInRole("admin"));
        Assert.Equal(role is null ? Array.Empty<string>() : [role], result.FindAll("app_role").Select(c => c.Value));
    }

    private sealed class ProfileReader(Guid expectedId, string? role) : IProfileRoleReader
    {
        public Task<string?> GetActiveRoleAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            Assert.Equal(expectedId, userId);
            return Task.FromResult(role);
        }
    }
}
