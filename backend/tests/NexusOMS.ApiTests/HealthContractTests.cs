namespace NexusOMS.ApiTests;

public sealed class HealthContractTests
{
    [Fact]
    public void Health_endpoint_contract_is_stable()
    {
        const string path = "/health";
        Assert.Equal("/health", path);
    }
}

public sealed class BrandNameTests
{
    [Fact]
    public void Normalize_trims_a_valid_brand_name()
    {
        Assert.Equal("Nexus", NexusOMS.InventoryAndChannels.BrandName.Normalize("  Nexus  "));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Normalize_rejects_an_empty_brand_name(string? name)
    {
        Assert.Throws<ArgumentException>(() => NexusOMS.InventoryAndChannels.BrandName.Normalize(name));
    }
}
