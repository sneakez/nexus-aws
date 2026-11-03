namespace NexusOMS.OrderingAndFinance;

public sealed class ReturnService(IReturnRepository repository)
{
    public Task<ReturnCase?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return repository.GetAsync(id, cancellationToken);
    }
    public Task<CreateReturnResult> CreateAsync(
    CreateReturnRequest request,
    Guid actorId,
    CancellationToken cancellationToken = default)
    {
        if (request.Id == Guid.Empty
            || request.OrderId == Guid.Empty
            || actorId == Guid.Empty)
        {
            throw new ArgumentException(
                "Mã yêu cầu, mã đơn và người thực hiện không được rỗng.");
        }

        var reason = request.Reason?.Trim();

        if (string.IsNullOrEmpty(reason) || reason.Length > 2000)
            throw new ArgumentException("Lý do phải có từ 1 đến 2000 ký tự.");

        if (request.Items is null
            || request.Items.Count == 0
            || request.Items.Count > 100)
        {
            throw new ArgumentException("Yêu cầu phải có từ 1 đến 100 dòng hàng.");
        }

        foreach (var item in request.Items)
        {
            if (item is null
                || item.OrderItemId == Guid.Empty
                || item.Quantity <= 0
                || item.Quantity > 99999999999.999m
                || decimal.Round(item.Quantity, 3) != item.Quantity)
            {
                throw new ArgumentException(
                    "Dòng hàng không hợp lệ hoặc số lượng không đúng.");
            }
        }

        var uniqueItemCount = request.Items
            .Select(item => item.OrderItemId)
            .Distinct()
            .Count();

        if (uniqueItemCount != request.Items.Count)
            throw new ArgumentException("Không được lặp dòng hàng trong yêu cầu.");

        var normalizedRequest = request with { Reason = reason };

        return repository.CreateAsync(
            normalizedRequest,
            actorId,
            cancellationToken);
    }
}
