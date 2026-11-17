-- Development/demo data only. Create Auth users from the Supabase dashboard.
-- Re-running this file refreshes only transactional rows prefixed NXDEMO.

begin;
set constraints all deferred;

-- Remove only data created by this demo seed.
delete from public.journal_lines
where journal_entry_id in (
  select id from public.journal_entries where entry_number like 'NXDEMO-JE-%'
);

delete from public.journal_entries where entry_number like 'NXDEMO-JE-%';

delete from public.return_items
where return_request_id in (
  select rr.id
  from public.return_requests rr
  join public.orders o on o.id = rr.order_id
  where o.order_number like 'NXDEMO-%'
);

delete from public.return_requests
where order_id in (
  select id from public.orders where order_number like 'NXDEMO-%'
);

delete from public.webhook_delivery_logs
where idempotency_key like 'NXDEMO-WEBHOOK-%';

delete from public.audit_logs
where metadata ->> 'seed' = 'NXDEMO';

delete from public.stock_transactions
where idempotency_key like 'NXDEMO-STOCK-%';

delete from public.orders where order_number like 'NXDEMO-%';

insert into public.brands (name)
values
  ('Nexus Demo Apparel'),
  ('Nexus Demo Lifestyle'),
  ('Nexus Demo Home')
on conflict (name) do update set updated_at = now();

with product_seed(sku, name, cost_price, brand_name) as (
  values
    ('NXDEMO-SKU-001', 'Áo thun Nexus Basic', 115000, 'Nexus Demo Apparel'),
    ('NXDEMO-SKU-002', 'Áo polo Nexus Premium', 185000, 'Nexus Demo Apparel'),
    ('NXDEMO-SKU-003', 'Sơ mi Oxford', 245000, 'Nexus Demo Apparel'),
    ('NXDEMO-SKU-004', 'Quần jean Urban', 310000, 'Nexus Demo Apparel'),
    ('NXDEMO-SKU-005', 'Quần short Active', 165000, 'Nexus Demo Apparel'),
    ('NXDEMO-SKU-006', 'Áo khoác Lightweight', 395000, 'Nexus Demo Apparel'),
    ('NXDEMO-SKU-007', 'Balo Daily Carry', 275000, 'Nexus Demo Lifestyle'),
    ('NXDEMO-SKU-008', 'Túi tote Canvas', 95000, 'Nexus Demo Lifestyle'),
    ('NXDEMO-SKU-009', 'Bình giữ nhiệt 600ml', 145000, 'Nexus Demo Lifestyle'),
    ('NXDEMO-SKU-010', 'Mũ lưỡi trai Classic', 85000, 'Nexus Demo Lifestyle'),
    ('NXDEMO-SKU-011', 'Ví card Slim', 125000, 'Nexus Demo Lifestyle'),
    ('NXDEMO-SKU-012', 'Ô gấp chống UV', 175000, 'Nexus Demo Lifestyle'),
    ('NXDEMO-SKU-013', 'Đèn bàn Minimal', 235000, 'Nexus Demo Home'),
    ('NXDEMO-SKU-014', 'Kệ để bàn Modular', 195000, 'Nexus Demo Home'),
    ('NXDEMO-SKU-015', 'Gối tựa Nordic', 135000, 'Nexus Demo Home'),
    ('NXDEMO-SKU-016', 'Nến thơm Cedar', 105000, 'Nexus Demo Home'),
    ('NXDEMO-SKU-017', 'Bộ ly thủy tinh', 155000, 'Nexus Demo Home'),
    ('NXDEMO-SKU-018', 'Khay gỗ đa năng', 215000, 'Nexus Demo Home')
)
insert into public.products (sku, name, cost_price, brand_id, is_active)
select s.sku, s.name, s.cost_price, b.id, true
from product_seed s
join public.brands b on b.name = s.brand_name
on conflict (sku) do update set
  name = excluded.name,
  cost_price = excluded.cost_price,
  brand_id = excluded.brand_id,
  is_active = true,
  updated_at = now();

insert into public.warehouses (code, name, address, priority, is_active)
values
  ('NXDEMO-WH-HCM', 'Kho demo TP.HCM', 'Thủ Đức, TP.HCM', 1, true),
  ('NXDEMO-WH-HN', 'Kho demo Hà Nội', 'Cầu Giấy, Hà Nội', 2, true)
on conflict (code) do update set
  name = excluded.name,
  address = excluded.address,
  priority = excluded.priority,
  is_active = true,
  updated_at = now();

insert into public.warehouse_bins (warehouse_id, code)
select w.id, b.code
from public.warehouses w
cross join (values ('A-01'), ('B-01')) b(code)
where w.code in ('NXDEMO-WH-HCM', 'NXDEMO-WH-HN')
on conflict (warehouse_id, code) do nothing;

insert into public.inventory_items (
  warehouse_id, product_id, bin_id, stock, reserved, pending_qc, incoming
)
select
  w.id,
  p.id,
  b.id,
  55 + (right(p.sku, 3)::integer * 3) + case when w.code = 'NXDEMO-WH-HCM' then 35 else 0 end,
  right(p.sku, 3)::integer % 7,
  right(p.sku, 3)::integer % 4,
  (right(p.sku, 3)::integer % 5) * 4
from public.warehouses w
join public.warehouse_bins b on b.warehouse_id = w.id and b.code = 'A-01'
cross join public.products p
where w.code in ('NXDEMO-WH-HCM', 'NXDEMO-WH-HN')
  and p.sku like 'NXDEMO-SKU-%'
on conflict (warehouse_id, product_id) do update set
  bin_id = excluded.bin_id,
  stock = excluded.stock,
  reserved = excluded.reserved,
  pending_qc = excluded.pending_qc,
  incoming = excluded.incoming,
  updated_at = now();

-- Keep the original workshop catalog usable in databases seeded before NXDEMO.
update public.inventory_items i
set stock = greatest(i.stock, 200),
    reserved = 0,
    pending_qc = 0,
    updated_at = now()
from public.warehouses w, public.products p
where i.warehouse_id = w.id
  and i.product_id = p.id
  and w.code = 'WH-HCM-01'
  and p.sku like 'SKU-DEMO-%';

insert into public.stock_transactions (
  warehouse_id, product_id, type, quantity_delta, reference_type, idempotency_key, created_at
)
select
  i.warehouse_id,
  i.product_id,
  'inbound'::public.stock_tx_type,
  i.stock,
  'demo_seed',
  'NXDEMO-STOCK-' || w.code || '-' || p.sku,
  now() - interval '60 days'
from public.inventory_items i
join public.warehouses w on w.id = i.warehouse_id
join public.products p on p.id = i.product_id
where w.code like 'NXDEMO-WH-%' and p.sku like 'NXDEMO-SKU-%'
on conflict (idempotency_key) where idempotency_key is not null do update set
  quantity_delta = excluded.quantity_delta,
  created_at = excluded.created_at;

insert into public.channel_connections (type, account_name, status)
values
  ('shopee', 'Nexus Demo Shopee', 'connected'),
  ('tiktok_shop', 'Nexus Demo TikTok Shop', 'connected'),
  ('lazada', 'Nexus Demo Lazada', 'connected'),
  ('website_d2c', 'Nexus Demo Website', 'connected')
on conflict (type, account_name) do update set
  status = 'connected',
  updated_at = now();

insert into public.channel_sku_mappings (
  channel_connection_id, product_id, channel_sku
)
select
  c.id,
  p.id,
  upper(c.type::text) || '-' || p.sku
from public.channel_connections c
cross join public.products p
where c.account_name like 'Nexus Demo %'
  and p.sku like 'NXDEMO-SKU-%'
on conflict (channel_connection_id, channel_sku) do update set
  product_id = excluded.product_id;

insert into public.customers (external_id, name, phone, email)
select
  'NXDEMO-CUST-' || lpad(n::text, 3, '0'),
  (array['Nguyễn','Trần','Lê','Phạm','Hoàng','Võ','Đặng','Bùi','Đỗ','Hồ'])[(n - 1) % 10 + 1]
    || ' ' ||
  (array['Minh Anh','Quang Huy','Thu Hà','Gia Bảo','Khánh Linh','Hoàng Nam'])[(n - 1) % 6 + 1],
  '090' || lpad((1000000 + n * 731)::text, 7, '0'),
  'demo.customer' || lpad(n::text, 2, '0') || '@nexusoms.local'
from generate_series(1, 30) n
on conflict (external_id) where external_id is not null do update set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  updated_at = now();

insert into public.fulfillment_waves (id, wave_number, warehouse_id, status, created_at)
select
  md5('NXDEMO-WAVE-' || n)::uuid,
  'NXDEMO-WAVE-' || lpad(n::text, 2, '0'),
  w.id,
  case n when 1 then 'completed' when 2 then 'packed' when 3 then 'picking' else 'open' end,
  now() - ((5 - n) || ' days')::interval
from generate_series(1, 4) n
join lateral (
  select id
  from public.warehouses
  where code = case when n % 2 = 1 then 'NXDEMO-WH-HCM' else 'NXDEMO-WH-HN' end
) w on true
on conflict (wave_number) do update set
  warehouse_id = excluded.warehouse_id,
  status = excluded.status,
  updated_at = now();

with
customer_rows as (
  select id, row_number() over (order by external_id) as rn
  from public.customers where external_id like 'NXDEMO-CUST-%'
),
channel_rows as (
  select id, row_number() over (order by type) as rn
  from public.channel_connections where account_name like 'Nexus Demo %'
),
warehouse_rows as (
  select id, row_number() over (order by code) as rn
  from public.warehouses where code like 'NXDEMO-WH-%'
),
wave_rows as (
  select id, row_number() over (order by wave_number) as rn
  from public.fulfillment_waves where wave_number like 'NXDEMO-WAVE-%'
),
order_seed as (
  select
    n,
    case n % 10
      when 0 then 'returned'
      when 1 then 'cancelled'
      when 2 then 'pending'
      when 3 then 'confirmed'
      when 4 then 'processing'
      when 5 then 'shipped'
      else 'delivered'
    end::public.order_status as status
  from generate_series(1, 50) n
)
insert into public.orders (
  id, customer_id, channel_connection_id, assigned_warehouse_id,
  fulfillment_wave_id, order_number, status, subtotal, tax,
  shipping_fee, total, idempotency_key, stock_restored,
  creation_request, is_demo, demo_batch_id, created_at, updated_at
)
select
  md5('NXDEMO-ORDER-' || s.n)::uuid,
  c.id,
  ch.id,
  w.id,
  case when s.status in ('processing', 'shipped', 'delivered', 'returned') then fw.id end,
  'NXDEMO-' || lpad(s.n::text, 4, '0'),
  s.status,
  0, 0, 0, 0,
  'NXDEMO-ORDER-' || s.n,
  s.status in ('cancelled', 'returned'),
  jsonb_build_object('source', 'NXDEMO', 'sequence', s.n),
  false,
  null,
  now() - ((51 - s.n) * interval '20 hours'),
  now() - ((51 - s.n) * interval '20 hours')
from order_seed s
join customer_rows c on c.rn = ((s.n - 1) % 30) + 1
join channel_rows ch on ch.rn = ((s.n - 1) % 4) + 1
join warehouse_rows w on w.rn = ((s.n - 1) % 2) + 1
join wave_rows fw on fw.rn = ((s.n - 1) % 4) + 1;

with
demo_orders as (
  select id, order_number,
    row_number() over (order by order_number) as order_no
  from public.orders where order_number like 'NXDEMO-%'
),
demo_products as (
  select id, sku, name, cost_price,
    row_number() over (order by sku) as product_no
  from public.products where sku like 'NXDEMO-SKU-%'
),
item_seed as (
  select o.*, item_no
  from demo_orders o
  cross join lateral generate_series(1, 1 + (o.order_no % 4)::integer) item_no
)
insert into public.order_items (
  id, order_id, product_id, product_sku, product_name,
  quantity, unit_price, unit_cost, line_total
)
select
  md5('NXDEMO-ITEM-' || s.order_no || '-' || s.item_no)::uuid,
  s.id,
  p.id,
  p.sku,
  p.name,
  1 + ((s.order_no + s.item_no) % 3),
  round(p.cost_price * (1.65 + ((s.order_no + s.item_no) % 4) * 0.1), 2),
  p.cost_price,
  round(
    (1 + ((s.order_no + s.item_no) % 3))
    * p.cost_price * (1.65 + ((s.order_no + s.item_no) % 4) * 0.1),
    2
  )
from item_seed s
join demo_products p
  on p.product_no = ((s.order_no + s.item_no - 2) % 18) + 1;

update public.orders o
set
  subtotal = totals.subtotal,
  tax = round(totals.subtotal * 0.08, 2),
  shipping_fee = case when totals.subtotal >= 700000 then 0 else 30000 end,
  total = totals.subtotal + round(totals.subtotal * 0.08, 2)
    + case when totals.subtotal >= 700000 then 0 else 30000 end
from (
  select order_id, sum(line_total) as subtotal
  from public.order_items
  group by order_id
) totals
where o.id = totals.order_id and o.order_number like 'NXDEMO-%';

insert into public.order_fee_breakdowns (order_id, fee_type, amount, created_at)
select o.id, f.fee_type,
  round(o.subtotal * f.rate, 2), o.created_at
from public.orders o
cross join (values
  ('Phí nền tảng', 0.08::numeric),
  ('Phí thanh toán', 0.02::numeric),
  ('Phí quảng cáo', 0.025::numeric)
) f(fee_type, rate)
where o.order_number like 'NXDEMO-%'
  and o.status not in ('cancelled', 'pending');

insert into public.order_status_log (
  order_id, from_status, to_status, note, created_at
)
select
  id,
  case when status = 'pending' then null else 'pending'::public.order_status end,
  status,
  'Trạng thái mẫu phục vụ trình diễn',
  created_at + interval '2 hours'
from public.orders
where order_number like 'NXDEMO-%';

insert into public.return_requests (id, order_id, status, reason, created_at, updated_at)
select
  md5('NXDEMO-RETURN-' || o.order_number)::uuid,
  o.id,
  case when right(o.order_number, 1)::integer % 2 = 0
    then 'refunded' else 'received' end::public.return_status,
  case when right(o.order_number, 1)::integer % 2 = 0
    then 'Sản phẩm không phù hợp' else 'Khách đổi ý sau khi nhận hàng' end,
  o.created_at + interval '6 days',
  o.created_at + interval '7 days'
from public.orders o
where o.order_number like 'NXDEMO-%' and o.status = 'returned';

insert into public.return_items (
  return_request_id, order_item_id, quantity, qc_disposition
)
select rr.id, oi.id, 1,
  case when rr.status = 'refunded' then 'restock' else 'pending_qc' end
from public.return_requests rr
join public.orders o on o.id = rr.order_id
join lateral (
  select id from public.order_items
  where order_id = o.id order by id limit 1
) oi on true
where o.order_number like 'NXDEMO-%';

insert into public.ledger_accounts (code, name)
values
  ('1100', 'Tiền và khoản phải thu'),
  ('1200', 'Hàng tồn kho'),
  ('4000', 'Doanh thu bán hàng'),
  ('5000', 'Giá vốn hàng bán')
on conflict (code) do update set name = excluded.name;

insert into public.journal_entries (
  id, entry_number, event_source, reference_id, posted_at, created_at
)
select
  md5('NXDEMO-JE-' || o.order_number)::uuid,
  'NXDEMO-JE-' || right(o.order_number, 4),
  'order_delivered',
  o.id,
  o.created_at + interval '3 days',
  o.created_at + interval '3 days'
from public.orders o
where o.order_number like 'NXDEMO-%' and o.status in ('delivered', 'returned');

with entry_amounts as (
  select
    je.id as journal_entry_id,
    o.total,
    sum(oi.quantity * oi.unit_cost) as cost_total
  from public.journal_entries je
  join public.orders o on o.id = je.reference_id
  join public.order_items oi on oi.order_id = o.id
  where je.entry_number like 'NXDEMO-JE-%'
  group by je.id, o.total
),
line_seed as (
  select journal_entry_id, '1100' as account_code, total as debit, 0::numeric as credit from entry_amounts
  union all
  select journal_entry_id, '4000', 0, total from entry_amounts
  union all
  select journal_entry_id, '5000', cost_total, 0 from entry_amounts
  union all
  select journal_entry_id, '1200', 0, cost_total from entry_amounts
)
insert into public.journal_lines (
  journal_entry_id, account_id, debit_amount, credit_amount
)
select s.journal_entry_id, a.id, s.debit, s.credit
from line_seed s
join public.ledger_accounts a on a.code = s.account_code;

with channel_rows as (
  select id, row_number() over (order by type) as rn
  from public.channel_connections where account_name like 'Nexus Demo %'
)
insert into public.webhook_delivery_logs (
  id, channel_connection_id, event_type, idempotency_key, payload,
  status, received_at, processed_at, error_message,
  retry_count, retryable, next_retry_at
)
select
  md5('NXDEMO-WEBHOOK-' || n)::uuid,
  c.id,
  case when n % 5 = 0 then 'order.cancelled' else 'order.created' end,
  'NXDEMO-WEBHOOK-' || n,
  jsonb_build_object(
    'eventId', 'NXDEMO-EVENT-' || n,
    'externalOrderId', 'NXDEMO-' || lpad((((n * 3) - 1) % 50 + 1)::text, 4, '0')
  ),
  case when n in (5, 11) then 'failed' else 'processed' end,
  now() - ((13 - n) * interval '3 hours'),
  case when n in (5, 11) then null else now() - ((13 - n) * interval '3 hours') + interval '8 seconds' end,
  case when n in (5, 11) then 'Demo: nền tảng nguồn tạm thời không phản hồi' end,
  case when n in (5, 11) then 2 else 0 end,
  n in (5, 11),
  case when n in (5, 11) then now() + interval '15 minutes' end
from generate_series(1, 12) n
join channel_rows c on c.rn = ((n - 1) % 4) + 1;

insert into public.audit_logs (
  action, entity_type, entity_id, metadata, created_at
)
select
  case n % 4
    when 0 then 'order.created'
    when 1 then 'order.confirmed'
    when 2 then 'inventory.reserved'
    else 'order.shipped'
  end,
  'order',
  o.id,
  jsonb_build_object('seed', 'NXDEMO', 'description', 'Hoạt động mẫu'),
  o.created_at + interval '30 minutes'
from generate_series(1, 16) n
join public.orders o on o.order_number = 'NXDEMO-' || lpad((n * 3)::text, 4, '0');

do $$
declare
  demo_product_count integer;
  demo_order_count integer;
  unbalanced_entry_count integer;
begin
  select count(*) into demo_product_count
  from public.products where sku like 'NXDEMO-SKU-%';

  select count(*) into demo_order_count
  from public.orders where order_number like 'NXDEMO-%';

  select count(*) into unbalanced_entry_count
  from (
    select je.id
    from public.journal_entries je
    join public.journal_lines jl on jl.journal_entry_id = je.id
    where je.entry_number like 'NXDEMO-JE-%'
    group by je.id
    having sum(jl.debit_amount) <> sum(jl.credit_amount)
  ) unbalanced;

  if demo_product_count <> 18 then
    raise exception 'Expected 18 demo products, found %', demo_product_count;
  end if;

  if demo_order_count <> 50 then
    raise exception 'Expected 50 demo orders, found %', demo_order_count;
  end if;

  if unbalanced_entry_count <> 0 then
    raise exception 'Found % unbalanced demo journal entries', unbalanced_entry_count;
  end if;
end
$$;

commit;

select
  (select count(*) from public.products where sku like 'NXDEMO-SKU-%') as products,
  (select count(*) from public.customers where external_id like 'NXDEMO-CUST-%') as customers,
  (select count(*) from public.orders where order_number like 'NXDEMO-%') as orders,
  (select count(*) from public.return_requests rr join public.orders o on o.id = rr.order_id where o.order_number like 'NXDEMO-%') as returns;
