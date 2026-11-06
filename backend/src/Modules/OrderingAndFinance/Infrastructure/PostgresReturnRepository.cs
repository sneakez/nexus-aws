using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresReturnRepository(
    NpgsqlDataSource dataSource) : IReturnRepository
{
    public async Task<IReadOnlyList<ReturnCaseSummary>> ListAsync(
        DateOnly? from,
        DateOnly? to,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            select r.id, r.status::text, r.reason, r.created_at,
                   o.id, o.order_number, o.status::text,
                   c.name, o.channel_connection_id, cc.account_name
            from public.return_requests r
            join public.orders o on o.id = r.order_id
            left join public.customers c on c.id = o.customer_id
            left join public.channel_connections cc on cc.id = o.channel_connection_id
            where (@from is null or r.created_at >= @from)
              and (@to is null or r.created_at < @to + interval '1 day')
            order by r.created_at desc, r.id
            limit 100
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("from", (object?)from ?? DBNull.Value);
        command.Parameters.AddWithValue("to", (object?)to ?? DBNull.Value);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var rows = new List<ReturnCaseSummary>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new ReturnCaseSummary(
                reader.GetGuid(0), reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetFieldValue<DateTimeOffset>(3), reader.GetGuid(4),
                reader.GetString(5), reader.GetString(6),
                reader.IsDBNull(7) ? null : reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetGuid(8),
                reader.IsDBNull(9) ? null : reader.GetString(9)));
        }

        return rows;
    }

    private static async Task<ReturnCase?> ReadAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction? transaction,
    Guid id,
    CancellationToken cancellationToken)
    {
        const string sql = """
            select id, order_id, status::text, reason
            from public.return_requests
            where id = @id;

            select order_item_id, quantity
            from public.return_items
            where return_request_id = @id
            order by id;
            """;

        await using var command =
    new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("id", id);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var returnId = reader.GetGuid(0);
        var orderId = reader.GetGuid(1);
        var status = reader.GetString(2);
        var reason = reader.IsDBNull(3)
            ? null
            : reader.GetString(3);

        var items = new List<ReturnLine>();

        await reader.NextResultAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            if (reader.IsDBNull(0))
            {
                throw new InvalidOperationException(
                    "Dòng trả hàng thiếu liên kết với dòng đơn gốc.");
            }

            items.Add(new ReturnLine(
                reader.GetGuid(0),
                reader.GetDecimal(1)));
        }

        return new ReturnCase(
            returnId,
            orderId,
            status,
            reason,
            items);
    }
    public async Task<ReturnCase?> GetAsync(
    Guid id,
    CancellationToken cancellationToken = default)
    {
        await using var connection =
            await dataSource.OpenConnectionAsync(cancellationToken);

        return await ReadAsync(
            connection,
            null,
            id,
            cancellationToken);
    }
    public async Task<CreateReturnResult> CreateAsync(
    CreateReturnRequest request,
    Guid actorId,
    CancellationToken cancellationToken = default)
    {
        await using var connection =
            await dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string lockSql = """
    select pg_advisory_xact_lock(
        hashtextextended(@key, 0)
    )
    """;

            await using (var command =
                new NpgsqlCommand(lockSql, connection, transaction))
            {
                command.Parameters.AddWithValue(
                    "key",
                    $"return-request:{request.Id}");

                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            var existing = await ReadAsync(
                connection,
                transaction,
                request.Id,
                cancellationToken);

            if (existing is not null)
            {
                var existingItems = existing.Items
                    .OrderBy(item => item.OrderItemId);

                var requestedItems = request.Items
                    .OrderBy(item => item.OrderItemId);

                var sameRequest =
                    existing.OrderId == request.OrderId
                    && existing.Reason == request.Reason
                    && existingItems.SequenceEqual(requestedItems);

                if (!sameRequest)
                {
                    throw new ReturnConflictException(
                        "Mã yêu cầu đã tồn tại với nội dung khác.");
                }

                return new CreateReturnResult(existing, true);
            }
            await ValidateReturnAsync(
                connection,
                transaction,
                request,
                cancellationToken);

            const string headerSql = """
            insert into public.return_requests (
                id, order_id, status, reason
            )
            values (@id, @orderId, 'requested', @reason)
            """;

            await using (var command =
                new NpgsqlCommand(headerSql, connection, transaction))
            {
                command.Parameters.AddWithValue("id", request.Id);
                command.Parameters.AddWithValue("orderId", request.OrderId);
                command.Parameters.AddWithValue("reason", request.Reason);

                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            const string itemSql = """
            insert into public.return_items (
                return_request_id, order_item_id, quantity
            )
            values (@returnId, @itemId, @quantity)
            """;

            foreach (var item in request.Items)
            {
                await using var command =
                    new NpgsqlCommand(itemSql, connection, transaction);

                command.Parameters.AddWithValue("returnId", request.Id);
                command.Parameters.AddWithValue("itemId", item.OrderItemId);
                command.Parameters.AddWithValue("quantity", item.Quantity);

                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            const string auditSql = """
            insert into public.audit_logs (
                actor_id, action, entity_type, entity_id, metadata
            )
            values (
                @actorId,
                'return.requested',
                'return_requests',
                @returnId,
                jsonb_build_object('orderId', cast(@orderId as text))
            )
            """;

            await using (var command =
                new NpgsqlCommand(auditSql, connection, transaction))
            {
                command.Parameters.AddWithValue("actorId", actorId);
                command.Parameters.AddWithValue("returnId", request.Id);
                command.Parameters.AddWithValue("orderId", request.OrderId);

                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);

            var created = new ReturnCase(
     request.Id,
     request.OrderId,
     "requested",
     request.Reason,
     request.Items);

            return new CreateReturnResult(created, false);
        }
        catch (PostgresException exception)
            when (
                exception.SqlState == PostgresErrorCodes.UniqueViolation
                && exception.ConstraintName == "return_requests_pkey")
        {
            throw new ReturnConflictException(
                "Mã yêu cầu trả hàng đã tồn tại.");
        }
    }
    private static async Task ValidateReturnAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    CreateReturnRequest request,
    CancellationToken cancellationToken)
    {
        const string orderSql = """
        select status::text
        from public.orders
        where id = @orderId
        for update
        """;

        await using (var command =
            new NpgsqlCommand(orderSql, connection, transaction))
        {
            command.Parameters.AddWithValue("orderId", request.OrderId);

            var status =
                await command.ExecuteScalarAsync(cancellationToken) as string;

            if (status is null)
                throw new OrderNotFoundException();

            if (status is not ("shipped" or "delivered" or "returned"))
            {
                throw new ReturnConflictException(
                    "Chỉ tạo yêu cầu trả hàng cho đơn đã bàn giao.");
            }
        }

        const string quantitySql = """
        select
            i.quantity - coalesce((
                select sum(ri.quantity)
                from public.return_items ri
                join public.return_requests r
                    on r.id = ri.return_request_id
                where ri.order_item_id = i.id
                    and r.status <> 'rejected'
            ), 0)
        from public.order_items i
        where i.id = @itemId
            and i.order_id = @orderId
        """;

        foreach (var item in request.Items)
        {
            await using var command =
                new NpgsqlCommand(quantitySql, connection, transaction);

            command.Parameters.AddWithValue("itemId", item.OrderItemId);
            command.Parameters.AddWithValue("orderId", request.OrderId);

            var result = await command.ExecuteScalarAsync(cancellationToken);

            if (result is not decimal remaining || item.Quantity > remaining)
            {
                throw new ReturnConflictException(
                    "Dòng hàng không thuộc đơn hoặc số lượng trả vượt lượng còn lại.");
            }
        }
    }
}
