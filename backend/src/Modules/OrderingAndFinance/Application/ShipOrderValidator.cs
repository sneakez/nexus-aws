namespace NexusOMS.OrderingAndFinance;

public static class ShipOrderValidator
{
    public static ShipOrderRequest Normalize(ShipOrderRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var key = request.IdempotencyKey?.Trim() ?? string.Empty;

        if (key.Length is 0 or > 120)
            throw new ArgumentException(
                "Khóa chống trùng phải có từ 1 đến 120 ký tự.");

        return request with { IdempotencyKey = key };
    }
}
