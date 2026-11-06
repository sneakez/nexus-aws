using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class CreateOrderValidatorTests
{
    [Fact]
    public void Rejects_selecting_existing_and_new_customer_together()
    {
        var request = new CreateOrderRequest(
            "customer-mode-conflict",
            "ORDER-CUSTOMER-001",
            Guid.NewGuid(),
            Guid.NewGuid(),
            0m,
            0m,
            [new CreateOrderLineRequest(Guid.NewGuid(), 1m, 100m)],
            NewCustomer: new CreateOrderCustomerRequest("Khách mới", null, null));

        var error = Assert.Throws<ArgumentException>(
            () => CreateOrderValidator.Validate(request));

        Assert.Contains("Chỉ chọn khách hàng", error.Message);
    }

    [Fact]
    public void Accepts_new_customer_without_existing_customer_id()
    {
        var request = new CreateOrderRequest(
            "new-customer",
            "ORDER-CUSTOMER-002",
            null,
            Guid.NewGuid(),
            0m,
            0m,
            [new CreateOrderLineRequest(Guid.NewGuid(), 1m, 100m)],
            NewCustomer: new CreateOrderCustomerRequest("Khách mới", "0900000000", null));

        CreateOrderValidator.Validate(request);
    }
}
