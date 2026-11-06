namespace NexusOMS.OrderingAndFinance;

public sealed class OrderCreationService(
    OrderPreparationService preparation,
    IOrderCreationRepository repository)
{
    public async Task<CreateOrderResult> CreateAsync(
        CreateOrderRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (actorId == Guid.Empty)
            throw new ArgumentException("Người tạo đơn không hợp lệ.");

        var normalized = request with
        {
            IdempotencyKey = request.IdempotencyKey?.Trim() ?? string.Empty,
            OrderNumber = request.OrderNumber?.Trim() ?? string.Empty,
            NewCustomer = request.NewCustomer is null ? null : new CreateOrderCustomerRequest(
                request.NewCustomer.Name?.Trim(),
                string.IsNullOrWhiteSpace(request.NewCustomer.Phone) ? null : request.NewCustomer.Phone.Trim(),
                string.IsNullOrWhiteSpace(request.NewCustomer.Email) ? null : request.NewCustomer.Email.Trim())
        };
        CreateOrderValidator.Validate(normalized);

        var replay = await repository.FindReplayAsync(
            normalized, cancellationToken);

        if (replay is not null)
            return replay;

        var prepared = await preparation.PrepareAsync(
            normalized, cancellationToken);

        return await repository.CreateAsync(
            normalized,
            prepared,
            actorId,
            cancellationToken);
    }
}
