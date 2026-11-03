using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NexusOMS.Api.Authorization;

namespace NexusOMS.ApiTests;

public class AuthorizationPolicyTests
{
    [Theory]
    [InlineData("admin", true)]
    [InlineData("manager", true)]
    [InlineData("warehouse", false)]
    [InlineData("authenticated", false)]
    public async Task Finance_policy_accepts_only_application_manager_or_admin(string role, bool expected)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddNexusAuthorization(new ConfigurationBuilder().Build());
        using var provider = services.BuildServiceProvider();
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim("app_role", role) }, "test", "sub", "app_role"));
        var result = await provider.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(user, null, Policies.ManagerOrAdmin);
        Assert.Equal(expected, result.Succeeded);
    }
}
