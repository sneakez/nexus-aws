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
        services.AddScoped<IOrderCreationRepository, PostgresOrderCreationRepository>();
        services.AddScoped<OrderPreparationService>();
        services.AddScoped<OrderCreationService>();
        services.AddScoped<IOrderCancellationRepository, PostgresOrderCancellationRepository>();
        services.AddScoped<OrderCancellationService>();
        services.AddScoped<IOrderShippingRepository, PostgresOrderShippingRepository>();
        services.AddScoped<OrderShippingService>();
        services.AddScoped<IOrderProgressRepository, PostgresOrderProgressRepository>();
        services.AddScoped<OrderContributionService>();
        services.AddScoped<OrderProgressService>();
        services.AddScoped<IJournalRepository, PostgresJournalRepository>();
        services.AddScoped<JournalService>();
        return services;
    }
}
