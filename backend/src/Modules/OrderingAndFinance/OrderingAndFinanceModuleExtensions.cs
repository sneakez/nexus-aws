using Microsoft.Extensions.DependencyInjection;

namespace NexusOMS.OrderingAndFinance;

public static class OrderingAndFinanceModuleExtensions
{
    public static IServiceCollection AddOrderingAndFinanceModule(
        this IServiceCollection services)
    {
        services.AddScoped<CustomerService>();

        return services;
    }
}
