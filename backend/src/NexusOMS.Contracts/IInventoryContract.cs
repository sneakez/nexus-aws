namespace NexusOMS.Contracts;

public interface IInventoryContract
{
    Task<InventoryReservationResult> ReserveAsync(
        InventoryReservationRequest request,
        InventoryTransactionContext context,
        CancellationToken cancellationToken = default);

    Task ReleaseAsync(
        InventoryReleaseRequest request,
        InventoryTransactionContext context,
        CancellationToken cancellationToken = default);

    Task CommitOutboundAsync(
        InventoryCommitRequest request,
        InventoryTransactionContext context,
        CancellationToken cancellationToken = default);

    Task ReturnInboundAsync(
        InventoryReturnRequest request,
        InventoryTransactionContext context,
        CancellationToken cancellationToken = default);
}

public sealed record InventoryReservationRequest(Guid ProductId, Guid WarehouseId, decimal Quantity, string IdempotencyKey, Guid OrderId);
public sealed record InventoryReservationResult(Guid TransactionId, decimal ReservedQuantity);
public sealed record InventoryReleaseRequest(Guid OrderId, string IdempotencyKey, string Reason);
public sealed record InventoryCommitRequest(Guid OrderId, string IdempotencyKey);
public sealed record InventoryReturnRequest(Guid OrderId, Guid ProductId, Guid WarehouseId, decimal Quantity, string IdempotencyKey);
