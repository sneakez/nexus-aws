using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using NexusOMS.Contracts;
namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresOrderCancellationRepository(
    NpgsqlDataSource dataSource,
    IInventoryContract inventory) : IOrderCancellationRepository
{
    private static string SerializeRequest(
        Guid orderId,
        CancelOrderRequest request) =>
        JsonSerializer.Serialize(new
        {
            OrderId = orderId,
            Reason = request.Reason
        });

    private static async Task<CancelOrderResult?> ReadReplayAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid orderId,
        CancelOrderRequest request,
        CancellationToken cancellationToken)
    {
        const string sql = """
            select order_id,
                   operation_type,
                   request_payload = @payload,
                   result_payload ->> 'status'
            from public.order_operation_receipts
            where idempotency_key = @key
            """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue(
            "key", request.IdempotencyKey);

        command.Parameters.Add(
            "payload", NpgsqlDbType.Jsonb).Value =
            SerializeRequest(orderId, request);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        if (reader.GetGuid(0) != orderId
            || reader.GetString(1) != "cancel"
            || !reader.GetBoolean(2))
        {
            throw new OrderTransitionConflictException(
                "Khóa chống trùng đã được dùng với nội dung khác.");
        }

        if (reader.IsDBNull(3)
            || reader.GetString(3) != "cancelled")
        {
            throw new InvalidOperationException(
                "Kết quả hủy đơn đã lưu không hợp lệ.");
        }

        return new CancelOrderResult(
            orderId, "cancelled", true);
    }
    private static async Task LockOperationAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    string idempotencyKey,
    CancellationToken cancellationToken)
    {
        const string sql = """
        select pg_advisory_xact_lock(
            hashtextextended(@key, 0));
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue(
            "key", $"order-operation:{idempotencyKey}");

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<string?> LockOrderAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        const string sql = """
        select status::text
        from public.orders
        where id = @orderId
        for update;
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("orderId", orderId);

        return await command.ExecuteScalarAsync(cancellationToken)
            as string;
    }
    private static async Task SaveCancellationAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    Guid orderId,
    string previousStatus,
    CancelOrderRequest request,
    Guid actorId,
    CancellationToken cancellationToken)
    {
        const string sql = """
        update public.orders
        set status = 'cancelled', updated_at = now()
        where id = @orderId;

        insert into public.order_status_log (
            order_id, from_status, to_status, note, created_by)
        values (
            @orderId, @previousStatus::public.order_status,
            'cancelled', @reason, @actorId);

        insert into public.audit_logs (
            actor_id, action, entity_type, entity_id, metadata)
        values (
            @actorId, 'order.cancelled', 'orders', @orderId,
            jsonb_build_object(
                'fromStatus', @previousStatus::text,
                'reason', @reason::text));

        insert into public.order_operation_receipts (
            idempotency_key, order_id, operation_type,
            request_payload, result_payload, created_by)
        values (
            @key, @orderId, 'cancel',
            @payload,
            jsonb_build_object('status', 'cancelled'),
            @actorId);
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("orderId", orderId);
        command.Parameters.AddWithValue("previousStatus", previousStatus);
        command.Parameters.AddWithValue("reason", request.Reason);
        command.Parameters.AddWithValue("actorId", actorId);
        command.Parameters.AddWithValue("key", request.IdempotencyKey);

        command.Parameters.Add(
            "payload", NpgsqlDbType.Jsonb).Value =
            SerializeRequest(orderId, request);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<CancelOrderResult?> CancelAsync(
    Guid orderId,
    CancelOrderRequest request,
    Guid actorId,
    CancellationToken cancellationToken = default)
    {
        await using var connection =
            await dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        await LockOperationAsync(
            connection, transaction,
            request.IdempotencyKey, cancellationToken);

        var replay = await ReadReplayAsync(
            connection, transaction,
            orderId, request, cancellationToken);

        if (replay is not null)
            return replay;

        var status = await LockOrderAsync(
            connection, transaction, orderId, cancellationToken);

        if (status is null)
            return null;

        if (!OrderTransitionRules.CanCancel(status))
            throw new OrderTransitionConflictException(
                $"Không thể hủy đơn ở trạng thái '{status}'.");

        await inventory.ReleaseAsync(
            new InventoryReleaseRequest(
                orderId,
                $"release:{orderId:N}",
                request.Reason),
            new InventoryTransactionContext(transaction),
            cancellationToken);

        await SaveCancellationAsync(
            connection, transaction,
            orderId, status, request, actorId,
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return new CancelOrderResult(orderId, "cancelled", false);
    }
}
