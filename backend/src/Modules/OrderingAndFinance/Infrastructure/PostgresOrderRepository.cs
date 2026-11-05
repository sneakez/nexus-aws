using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresOrderRepository(NpgsqlDataSource dataSource) : IOrderRepository
{
    public async Task<IReadOnlyList<OrderStatusEntry>?> GetHistoryAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = """
            select exists(select 1 from public.orders where id = @id);
            select id, from_status::text, to_status::text, note, created_by, created_at
            from public.order_status_log where order_id = @id
            order by created_at, id;
            """;
        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        if (!reader.GetBoolean(0)) return null;
        await reader.NextResultAsync(cancellationToken);
        var entries = new List<OrderStatusEntry>();
        while (await reader.ReadAsync(cancellationToken))
            entries.Add(new OrderStatusEntry(
                reader.GetGuid(0), reader.IsDBNull(1) ? null : reader.GetString(1),
                reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetGuid(4),
                reader.GetFieldValue<DateTimeOffset>(5)));
        return entries;
    }
    public async Task<IReadOnlyList<OrderSummary>> ListAsync(DateOnly? from, DateOnly? to,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            select id, order_number, status::text, total, created_at, channel_connection_id
            from public.orders
            where (@from is null or created_at >= @from)
              and (@to is null or created_at < @to + interval '1 day')
            order by created_at desc, id
            limit 100
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("from", (object?)from ?? DBNull.Value);
        command.Parameters.AddWithValue("to", (object?)to ?? DBNull.Value);
        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var orders = new List<OrderSummary>();

        while (await reader.ReadAsync(cancellationToken))
        {
            orders.Add(new OrderSummary(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDecimal(3),
                reader.GetFieldValue<DateTimeOffset>(4),
                reader.IsDBNull(5) ? null : reader.GetGuid(5)));
        }

        return orders;
    }
    public async Task<OrderDetail?> GetAsync(
    Guid id,
    CancellationToken cancellationToken = default)
    {
        const string sql = """
        select o.id, o.order_number, o.status::text, o.customer_id,
               o.subtotal, o.tax, o.shipping_fee, o.total, o.created_at, c.name, o.channel_connection_id
        from public.orders o
        left join public.customers c on c.id = o.customer_id
        where o.id = @id;

        select id, product_id, product_sku, product_name,
               quantity, unit_price, line_total, unit_cost
        from public.order_items
        where order_id = @id
        order by id;
        """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", id);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var items = new List<OrderLine>();

        var order = new OrderDetail(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetGuid(3),
            reader.GetDecimal(4),
            reader.GetDecimal(5),
            reader.GetDecimal(6),
            reader.GetDecimal(7),
            reader.GetFieldValue<DateTimeOffset>(8),
            items,
            reader.IsDBNull(9) ? null : reader.GetString(9),
            reader.IsDBNull(10) ? null : reader.GetGuid(10));

        await reader.NextResultAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new OrderLine(
                 reader.GetGuid(0),
                 reader.IsDBNull(1) ? null : reader.GetGuid(1),
                 reader.IsDBNull(2) ? null : reader.GetString(2),
                 reader.GetString(3),
                 reader.GetDecimal(4),
                 reader.GetDecimal(5),
                 reader.GetDecimal(6),
                 reader.IsDBNull(7) ? null : reader.GetDecimal(7)));
        }

        return order;
    }
}
