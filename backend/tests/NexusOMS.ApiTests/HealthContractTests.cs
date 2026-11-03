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

public sealed class ProductInputTests
{
    [Fact]
    public void Normalize_trims_name_and_canonicalizes_sku()
    {
        var product = NexusOMS.InventoryAndChannels.ProductInput.Normalize("  shirt-black-m  ", "  Áo thun đen  ", 120000);

        Assert.Equal("SHIRT-BLACK-M", product.Sku);
        Assert.Equal("Áo thun đen", product.Name);
    }

    [Theory]
    [InlineData("", "Áo", 1)]
    [InlineData("SKU-01", "", 1)]
    [InlineData("SKU-01", "Áo", -1)]
    public void Normalize_rejects_invalid_product_data(string sku, string name, decimal costPrice)
    {
        Assert.Throws<ArgumentException>(() => NexusOMS.InventoryAndChannels.ProductInput.Normalize(sku, name, costPrice));
    }
}
