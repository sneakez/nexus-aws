using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class OrderTransitionRulesTests
{
    [Theory]
    [InlineData("pending", true)]
    [InlineData("confirmed", true)]
    [InlineData("processing", true)]
    [InlineData("shipped", false)]
    [InlineData("delivered", false)]
    [InlineData("cancelled", false)]
    [InlineData("returned", false)]
    [InlineData("unknown", false)]
    public void Checks_when_order_can_be_cancelled(
        string status, bool expected)
    {
        Assert.Equal(expected, OrderTransitionRules.CanCancel(status));
    }

    [Theory]
    [InlineData("pending", false)]
    [InlineData("confirmed", false)]
    [InlineData("processing", true)]
    [InlineData("shipped", false)]
    [InlineData("delivered", false)]
    [InlineData("cancelled", false)]
    [InlineData("returned", false)]
    [InlineData("unknown", false)]
    public void Checks_when_order_can_be_shipped(
        string status, bool expected)
    {
        Assert.Equal(expected, OrderTransitionRules.CanShip(status));
    }
}
