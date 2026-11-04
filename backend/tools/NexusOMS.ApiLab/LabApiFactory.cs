using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using NexusOMS.Api.Authorization;
using Npgsql;

namespace NexusOMS.ApiLab;

// This override exists only in a separate lab executable. It is not referenced by the API.
internal sealed class LabApiFactory(string root, string connectionString, SecurityKey key)
    : WebApplicationFactory<global::Program>
{
    internal const string Issuer = "nexus-local-api-lab";
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseContentRoot(Path.Combine(root, "backend", "src", "NexusOMS.Api"));
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Postgres"] = connectionString,
            ["Supabase:Url"] = "https://unused.invalid"
        }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<NpgsqlDataSource>();
            services.AddSingleton(_ => NpgsqlDataSource.Create(connectionString));
            services.RemoveAll<IClaimsTransformation>();
            services.AddTransient<IClaimsTransformation, ProfileClaimsTransformation>();
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.Authority = null;
                options.MetadataAddress = string.Empty;
                options.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(
                    new OpenIdConnectConfiguration { Issuer = Issuer });
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = Issuer, ValidAudience = "authenticated",
                    IssuerSigningKey = key, ValidateIssuerSigningKey = true,
                    ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, RoleClaimType = "app_role"
                };
            });
        });
    }
}
