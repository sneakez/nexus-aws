using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class ArchitectureTests
{
    [Fact]
    public void Inner_layers_do_not_reference_database_or_infrastructure()
    {
        var assemblies = new[] { typeof(Brand).Assembly, typeof(Customer).Assembly,
            typeof(BrandService).Assembly, typeof(CustomerService).Assembly };
        foreach (var assembly in assemblies)
            Assert.DoesNotContain(assembly.GetReferencedAssemblies(), reference =>
                reference.Name == "Npgsql" || reference.Name!.EndsWith(".Infrastructure") ||
                reference.Name == "NexusOMS.Api");
    }
}
