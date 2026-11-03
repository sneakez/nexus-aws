using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication;
namespace NexusOMS.Api.Authorization;

public static class NexusAuthorizationExtensions
{
    public static IServiceCollection AddNexusAuthorization(this IServiceCollection services, IConfiguration configuration)
    {
        var supabaseUrl = configuration["Supabase:Url"];

        if (!string.IsNullOrWhiteSpace(supabaseUrl))
        {
            services.AddTransient<IClaimsTransformation, ProfileClaimsTransformation>();
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.Authority = $"{supabaseUrl.TrimEnd('/')}/auth/v1";
                    options.Audience = "authenticated";
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        RoleClaimType = "app_role",
                    };
                });
        }
        else
        {
            services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer();
        }

        services.AddAuthorization(options =>
        {
            options.AddPolicy(Policies.Admin, policy => policy.RequireRole(Roles.Admin));
            options.AddPolicy(Policies.ManagerOrAdmin, policy => policy.RequireRole(Roles.Admin, Roles.Manager));
            options.AddPolicy(Policies.WarehouseOrAbove, policy => policy.RequireRole(Roles.Admin, Roles.Manager, Roles.Warehouse));
        });

        return services;
    }
}

public static class Roles
{
    public const string Admin = "admin";
    public const string Manager = "manager";
    public const string Warehouse = "warehouse";
}

public static class Policies
{
    public const string Admin = "admin";
    public const string ManagerOrAdmin = "manager-or-admin";
    public const string WarehouseOrAbove = "warehouse-or-above";
}
