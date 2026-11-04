using NexusOMS.Contracts;
using NexusOMS.InventoryAndChannels;

namespace NexusOMS.ApiTests;

public class InventoryOperationRequestValidatorTests
{
    [Fact]
    public void Reserve_requires_quantity_with_at_most_three_decimals()
    {
        var request = new InventoryReservationRequest(Guid.NewGuid(), Guid.NewGuid(), 1.2345m, "reserve-001", Guid.NewGuid());
        Assert.Throws<ArgumentException>(() => InventoryOperationRequestValidator.Validate(request));
    }

    [Fact]
    public void Reserve_accepts_valid_request()
    {
        var request = new InventoryReservationRequest(Guid.NewGuid(), Guid.NewGuid(), 1.234m, "reserve-001", Guid.NewGuid());
        InventoryOperationRequestValidator.Validate(request);
    }
}
