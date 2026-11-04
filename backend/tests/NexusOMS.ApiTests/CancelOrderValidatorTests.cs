using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class CancelOrderValidatorTests
{
    [Fact]
    public void Trims_key_and_reason()
    {
        var request = new CancelOrderRequest(
            "  cancel-001  ",
            "  Khách đổi ý  ");

        var normalized = CancelOrderValidator.Normalize(request);

        Assert.Equal("cancel-001", normalized.IdempotencyKey);
        Assert.Equal("Khách đổi ý", normalized.Reason);
        Assert.Equal("  Khách đổi ý  ", request.Reason);
    }

    [Theory]
    [InlineData("", "Khách đổi ý")]
    [InlineData("   ", "Khách đổi ý")]
    [InlineData("cancel-001", "")]
    [InlineData("cancel-001", "   ")]
    public void Rejects_blank_key_or_reason(string key, string reason)
    {
        var request = new CancelOrderRequest(key, reason);

        Assert.Throws<ArgumentException>(
            () => CancelOrderValidator.Normalize(request));
    }

    [Fact]
    public void Rejects_key_over_limit()
    {
        var request = new CancelOrderRequest(
            new string('k', 121), "Khách đổi ý");

        Assert.Throws<ArgumentException>(
            () => CancelOrderValidator.Normalize(request));
    }

    [Fact]
    public void Rejects_reason_over_limit()
    {
        var request = new CancelOrderRequest(
            "cancel-001", new string('x', 2001));

        Assert.Throws<ArgumentException>(
            () => CancelOrderValidator.Normalize(request));
    }
}
