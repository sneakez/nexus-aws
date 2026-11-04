namespace NexusOMS.OrderingAndFinance;

public static class CancelOrderValidator
{
    public static CancelOrderRequest Normalize(
        CancelOrderRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var key = request.IdempotencyKey?.Trim() ?? string.Empty;
        var reason = request.Reason?.Trim() ?? string.Empty;

        if (key.Length is 0 or > 120)
            throw new ArgumentException(
                "Khóa chống trùng phải có từ 1 đến 120 ký tự.");

        if (reason.Length is 0 or > 2000)
            throw new ArgumentException(
                "Lý do hủy phải có từ 1 đến 2000 ký tự.");

        return request with
        {
            IdempotencyKey = key,
            Reason = reason
        };
    }
}
