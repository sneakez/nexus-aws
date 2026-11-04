using System.Text.Json;
using Npgsql;
using NpgsqlTypes;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresOrderProgressRepository(NpgsqlDataSource dataSource) : IOrderProgressRepository
{
    public async Task<OrderProgressResult?> AdvanceAsync(Guid orderId, string operation,
        OrderProgressRequest request, Guid actorId, CancellationToken cancellationToken = default)
    {
        var target = operation switch
        {
            "confirm" => "confirmed",
            "process" => "processing",
            _ => throw new ArgumentException("Thao tác không hợp lệ.")
        };
        var payload = JsonSerializer.Serialize(new { OrderId = orderId });
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using (var command = new NpgsqlCommand(
            "select pg_advisory_xact_lock(hashtextextended(@key, 0))", connection, transaction))
        {
            command.Parameters.AddWithValue("key", $"order-operation:{request.IdempotencyKey}");
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        await using (var command = new NpgsqlCommand("""
            select order_id, operation_type, request_payload = @payload, result_payload ->> 'status'
            from public.order_operation_receipts where idempotency_key = @key
            """, connection, transaction))
        {
            command.Parameters.AddWithValue("key", request.IdempotencyKey);
            command.Parameters.Add("payload", NpgsqlDbType.Jsonb).Value = payload;
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                if (reader.GetGuid(0) != orderId || reader.GetString(1) != operation || !reader.GetBoolean(2))
                    throw new OrderTransitionConflictException("Khóa chống trùng đã được dùng với nội dung khác.");
                if (reader.IsDBNull(3) || reader.GetString(3) != target)
                    throw new InvalidOperationException("Receipt chuyển trạng thái không hợp lệ.");
                return new OrderProgressResult(orderId, target, true);
            }
        }
        string? previous;
        await using (var command = new NpgsqlCommand(
            "select status::text from public.orders where id = @id for update", connection, transaction))
        {
            command.Parameters.AddWithValue("id", orderId);
            previous = await command.ExecuteScalarAsync(cancellationToken) as string;
        }
        if (previous is null) return null;
        var allowed = operation == "confirm"
            ? OrderTransitionRules.CanConfirm(previous)
            : OrderTransitionRules.CanProcess(previous);
        if (!allowed)
            throw new OrderTransitionConflictException($"Không thể {operation} đơn ở trạng thái '{previous}'.");

        await using (var command = new NpgsqlCommand("""
            update public.orders set status = @target::public.order_status, updated_at = now() where id = @id;
            insert into public.order_status_log(order_id, from_status, to_status, note, created_by)
                values (@id, @previous::public.order_status, @target::public.order_status, @note, @actor);
            insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
                values (@actor, @action, 'orders', @id,
                    jsonb_build_object('fromStatus', @previous::text, 'toStatus', @target::text));
            insert into public.order_operation_receipts
                (idempotency_key, order_id, operation_type, request_payload, result_payload, created_by)
                values (@key, @id, @operation, @payload, jsonb_build_object('status', @target::text), @actor);
            """, connection, transaction))
        {
            command.Parameters.AddWithValue("id", orderId);
            command.Parameters.AddWithValue("target", target);
            command.Parameters.AddWithValue("previous", previous);
            command.Parameters.AddWithValue("note", operation == "confirm" ? "Xác nhận đơn hàng" : "Bắt đầu xử lý đơn");
            command.Parameters.AddWithValue("actor", actorId);
            command.Parameters.AddWithValue("action", $"order.{target}");
            command.Parameters.AddWithValue("key", request.IdempotencyKey);
            command.Parameters.AddWithValue("operation", operation);
            command.Parameters.Add("payload", NpgsqlDbType.Jsonb).Value = payload;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        return new OrderProgressResult(orderId, target, false);
    }
}
