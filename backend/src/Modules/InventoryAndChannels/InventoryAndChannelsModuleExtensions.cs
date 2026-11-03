using Microsoft.Extensions.DependencyInjection;
namespace NexusOMS.InventoryAndChannels;

public static class InventoryAndChannelsModuleExtensions
{
    public static IServiceCollection AddInventoryAndChannelsModule(this IServiceCollection services)
    {
        services.AddScoped<IBrandRepository, PostgresBrandRepository>();
        services.AddScoped<BrandService>();
        services.AddSingleton<ProductService>();
        services.AddSingleton<WarehouseService>();
        return services;
    }
}
