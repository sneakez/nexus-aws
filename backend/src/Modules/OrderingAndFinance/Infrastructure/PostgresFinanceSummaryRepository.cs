using Npgsql;

namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresFinanceSummaryRepository(NpgsqlDataSource dataSource) : IFinanceSummaryRepository
{
    private const string SkuSql = """
        with summary as (
            select coalesce(i.product_sku, i.product_name) as label,
                   count(distinct o.id) as order_count, sum(i.quantity) as quantity,
                   sum(i.line_total) as revenue,
                   case when bool_and(i.unit_cost is not null) then sum(i.quantity * i.unit_cost) end as cogs
            from public.order_items i
            join public.orders o on o.id = i.order_id
            where o.status <> 'cancelled'
            group by coalesce(i.product_sku, i.product_name)
        )
        select label, label, order_count::text, quantity::text, revenue::text, cogs::text,
               null::text, null::text, (revenue - cogs)::text, null::text, null::text
        from summary
        order by revenue desc, label
        """;

    private const string ChannelSql = """
        with item_totals as (
            select order_id,
                   case when bool_and(unit_cost is not null) then sum(quantity * unit_cost) end as cogs
            from public.order_items
            group by order_id
        ), fee_totals as (
            select order_id,
                   coalesce(sum(amount) filter (where fee_type <> 'ads'), 0) as operating,
                   coalesce(sum(amount) filter (where fee_type = 'ads'), 0) as ads
            from public.order_fee_breakdowns
            group by order_id
        ), summary as (
            select coalesce(c.id::text, 'unassigned') as id,
                   coalesce(c.type || ' · ' || c.account_name, 'Chưa gắn kênh') as label,
                   count(*) as order_count, sum(o.subtotal + o.shipping_fee) as revenue,
                   case when bool_and(i.cogs is not null) then sum(i.cogs) end as cogs,
                   sum(coalesce(f.operating, 0)) as operating, sum(coalesce(f.ads, 0)) as ads
            from public.orders o
            left join public.webhook_delivery_logs delivery
                on delivery.idempotency_key = o.idempotency_key and delivery.status = 'processed'
            left join public.channel_connections c on c.id = coalesce(o.channel_connection_id, delivery.channel_connection_id)
            left join item_totals i on i.order_id = o.id
            left join fee_totals f on f.order_id = o.id
            where o.status <> 'cancelled'
            group by c.id, c.type, c.account_name
        )
        select id, label, order_count::text, null::text, revenue::text, cogs::text,
               operating::text, ads::text, (revenue - cogs)::text,
               (revenue - cogs - operating)::text, (revenue - cogs - operating - ads)::text
        from summary
        order by revenue desc, id
        """;

    public async Task<IReadOnlyList<FinanceSummaryRow>> ListAsync(bool byChannel, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand(byChannel ? ChannelSql : SkuSql);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rows = new List<FinanceSummaryRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            string? Optional(int index) => reader.IsDBNull(index) ? null : reader.GetString(index);
            rows.Add(new FinanceSummaryRow(reader.GetString(0), reader.GetString(1), reader.GetString(2),
                Optional(3), reader.GetString(4), Optional(5), Optional(6), Optional(7),
                Optional(8), Optional(9), Optional(10)));
        }
        return rows;
    }
}
