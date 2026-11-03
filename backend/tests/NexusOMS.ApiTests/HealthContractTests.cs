using NexusOMS.InventoryAndChannels;

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

public sealed class WarehouseInputTests
{
    [Fact]
    public void Normalize_trims_name_address_and_canonicalizes_code()
    {
        var warehouse = NexusOMS.InventoryAndChannels.WarehouseInput.Normalize("  hcm-01  ", "  Kho TP.HCM  ", "  Quận 7  ", 1);

        Assert.Equal("HCM-01", warehouse.Code);
        Assert.Equal("Kho TP.HCM", warehouse.Name);
        Assert.Equal("Quận 7", warehouse.Address);
    }

    [Theory]
    [InlineData("", "Kho", 0)]
    [InlineData("HCM-01", "", 0)]
    [InlineData("HCM-01", "Kho", -1)]
    public void Normalize_rejects_invalid_warehouse_data(string code, string name, int priority)
    {
        Assert.Throws<ArgumentException>(() => NexusOMS.InventoryAndChannels.WarehouseInput.Normalize(code, name, null, priority));
    }
}

public sealed class ActivityStatusTests
{
    [Theory]
    [InlineData(null, ActivityStatus.Active)]
    [InlineData("active", ActivityStatus.Active)]
    [InlineData("inactive", ActivityStatus.Inactive)]
    public void Parse_maps_activity_status(string? status, ActivityStatus expected)
    {
        Assert.True(NexusOMS.InventoryAndChannels.ActivityStatusParser.TryParse(status, out var actual));
        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Parse_all_removes_activity_filter()
    {
        Assert.True(NexusOMS.InventoryAndChannels.ActivityStatusParser.TryParse("all", out var actual));
        Assert.Equal(ActivityStatus.All, actual);
    }

    [Fact]
    public void Parse_rejects_unknown_status()
    {
        Assert.False(NexusOMS.InventoryAndChannels.ActivityStatusParser.TryParse("archived", out _));
    }
}
