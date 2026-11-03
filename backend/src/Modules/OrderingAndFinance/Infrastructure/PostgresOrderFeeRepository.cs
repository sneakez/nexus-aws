using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresOrderFeeRepository(
    NpgsqlDataSource dataSource) : IOrderFeeRepository
{
    public async Task<IReadOnlyList<OrderFee>> ListAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            select id, order_id, fee_type, amount
            from public.order_fee_breakdowns
            where order_id = @orderId
            order by created_at, id
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("orderId", orderId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var fees = new List<OrderFee>();

        while (await reader.ReadAsync(cancellationToken))
        {
            fees.Add(new OrderFee(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetString(2),
                reader.GetDecimal(3)));
        }

        return fees;
    }
    public async Task<OrderFee> CreateAsync(
     OrderFee fee,
     Guid actorId,
     CancellationToken cancellationToken = default)
    {
        await using var connection =
            await dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string feeSql = """
            insert into public.order_fee_breakdowns (
                id, order_id, fee_type, amount
            )
            values (@id, @orderId, @feeType, @amount)
            """;

            await using (var command =
                new NpgsqlCommand(feeSql, connection, transaction))
            {
                command.Parameters.AddWithValue("id", fee.Id);
                command.Parameters.AddWithValue("orderId", fee.OrderId);
                command.Parameters.AddWithValue("feeType", fee.FeeType);
                command.Parameters.AddWithValue("amount", fee.Amount);

                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            const string auditSql = """
            insert into public.audit_logs (
                actor_id, action, entity_type, entity_id, metadata
            )
            values (
                @actorId,
                'fee.created',
                'order_fee_breakdowns',
                @feeId,
                jsonb_build_object(
                    'orderId', cast(@orderId as text),
                    'feeType', cast(@feeType as text),
                    'amount', cast(@amount as numeric)
                )
            )
            """;

            await using (var command =
                new NpgsqlCommand(auditSql, connection, transaction))
            {
                command.Parameters.AddWithValue("actorId", actorId);
                command.Parameters.AddWithValue("feeId", fee.Id);
                command.Parameters.AddWithValue("orderId", fee.OrderId);
                command.Parameters.AddWithValue("feeType", fee.FeeType);
                command.Parameters.AddWithValue("amount", fee.Amount);

                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);

            return fee;
        }
        catch (PostgresException exception)
            when (
                exception.SqlState == PostgresErrorCodes.UniqueViolation
                && exception.ConstraintName == "order_fee_breakdowns_pkey")
        {
            throw new FeeAlreadyExistsException();
        }
        catch (PostgresException exception)
            when (
                exception.SqlState == PostgresErrorCodes.ForeignKeyViolation
                && exception.ConstraintName == "order_fee_breakdowns_order_id_fkey")
        {
            throw new OrderNotFoundException();
        }
    }
}
