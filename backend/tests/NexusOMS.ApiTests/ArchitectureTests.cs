using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class ArchitectureTests
{
    [Fact]
    public void Inner_layers_do_not_reference_database_or_infrastructure()
    {
        var assemblies = new[] { typeof(BrandName).Assembly, typeof(CustomerName).Assembly,
            typeof(BrandService).Assembly, typeof(CustomerService).Assembly };
        foreach (var assembly in assemblies)
            Assert.DoesNotContain(assembly.GetReferencedAssemblies(), reference =>
                reference.Name == "Npgsql" || reference.Name!.EndsWith(".Infrastructure") ||
                reference.Name == "NexusOMS.Api");
    }

    [Fact]
    public void Query_models_belong_to_application()
    {
        Assert.Equal(typeof(OrderService).Assembly, typeof(OrderSummary).Assembly);
        Assert.Equal(typeof(OrderService).Assembly, typeof(OrderDetail).Assembly);
        Assert.Equal(typeof(OrderService).Assembly, typeof(OrderLine).Assembly);
        Assert.Equal(typeof(CustomerService).Assembly, typeof(Customer).Assembly);
    }
}
