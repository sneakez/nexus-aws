namespace NexusOMS.OrderingAndFinance;

public static class CreateOrderValidator
{
    public static void Validate(CreateOrderRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (string.IsNullOrWhiteSpace(request.IdempotencyKey)
            || request.IdempotencyKey.Length > 120)
            throw new ArgumentException(
                "Khóa chống trùng phải có từ 1 đến 120 ký tự.");

        if (string.IsNullOrWhiteSpace(request.OrderNumber)
            || request.OrderNumber.Length > 120)
            throw new ArgumentException(
                "Mã đơn phải có từ 1 đến 120 ký tự.");

        if (request.WarehouseId == Guid.Empty)
            throw new ArgumentException("Kho không hợp lệ.");

        if (request.CustomerId == Guid.Empty)
            throw new ArgumentException("Mã khách hàng không hợp lệ.");

        ValidateMoney(request.Tax);
        ValidateMoney(request.ShippingFee);

        if (request.Items is null || request.Items.Count is 0 or > 100)
            throw new ArgumentException("Đơn phải có từ 1 đến 100 dòng hàng.");

        foreach (var item in request.Items)
        {
            if (item is null || item.ProductId == Guid.Empty)
                throw new ArgumentException("Sản phẩm không hợp lệ.");

            if (item.Quantity <= 0
                || item.Quantity > 99999999999.999m
                || decimal.Round(item.Quantity, 3) != item.Quantity)
                throw new ArgumentException(
                    "Số lượng phải dương và có tối đa 3 chữ số thập phân.");

            ValidateMoney(item.UnitPrice);
        }

        if (request.Items.Select(item => item.ProductId).Distinct().Count()
            != request.Items.Count)
            throw new ArgumentException(
                "Mỗi sản phẩm chỉ được xuất hiện một lần trong đơn.");
    }

    private static void ValidateMoney(decimal amount)
    {
        if (amount < 0
            || amount > 999999999999.99m
            || decimal.Round(amount, 2) != amount)
            throw new ArgumentException(
                "Số tiền phải không âm, tối đa 12 chữ số nguyên và 2 chữ số thập phân.");
    }
}
