using Microsoft.Extensions.DependencyInjection;
using NexusOMS.Contracts;
namespace NexusOMS.InventoryAndChannels;

public static class InventoryAndChannelsModuleExtensions
{
    public static IServiceCollection AddInventoryAndChannelsModule(this IServiceCollection services)
    {
        services.AddScoped<IBrandRepository, PostgresBrandRepository>();
        services.AddScoped<BrandService>();
        services.AddScoped<IProductRepository, PostgresProductRepository>();
        services.AddScoped<ProductService>();
        services.AddScoped<IWarehouseRepository, PostgresWarehouseRepository>();
        services.AddScoped<WarehouseService>();
        services.AddScoped<IWarehouseBinRepository, PostgresWarehouseBinRepository>();
        services.AddScoped<WarehouseBinService>();
        services.AddScoped<IInventoryRepository, PostgresInventoryRepository>();
        services.AddScoped<InventoryService>();
        services.AddScoped<IInventoryContract, PostgresInventoryContract>();
        services.AddScoped<IProductCatalogContract, PostgresProductCatalogContract>();
        services.AddScoped<IChannelRepository, PostgresChannelRepository>();
        services.AddScoped<ChannelService>();
        return services;
    }
}
