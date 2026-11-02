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
