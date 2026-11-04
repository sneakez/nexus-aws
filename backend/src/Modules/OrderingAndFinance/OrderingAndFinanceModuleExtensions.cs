using Microsoft.Extensions.DependencyInjection;
namespace NexusOMS.OrderingAndFinance;

public static class OrderingAndFinanceModuleExtensions
{
    public static IServiceCollection AddOrderingAndFinanceModule(this IServiceCollection services)
    {
        services.AddScoped<ICustomerRepository, PostgresCustomerRepository>();
        services.AddScoped<IOrderRepository, PostgresOrderRepository>();
        services.AddScoped<CustomerService>();
        services.AddScoped<OrderService>();
        services.AddScoped<IOrderFeeRepository, PostgresOrderFeeRepository>();
        services.AddScoped<OrderFeeService>();
        services.AddScoped<IReturnRepository, PostgresReturnRepository>();
        services.AddScoped<ReturnService>();
        services.AddScoped<OrderProfitService>();
        return services;
    }
}
