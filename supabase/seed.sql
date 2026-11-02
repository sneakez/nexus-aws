-- Development/demo data only. Auth users are created from the Supabase dashboard.

insert into public.brands (name)
values ('Nexus Demo')
on conflict (name) do nothing;

insert into public.warehouses (code, name, address, priority)
values ('WH-HCM-01', 'Kho TP HCM', 'TP HCM', 1)
on conflict (code) do nothing;

insert into public.products (brand_id, sku, name, cost_price)
select b.id, values_row.sku, values_row.name, values_row.cost_price
from public.brands b
cross join (values
  ('SKU-DEMO-001', 'Áo thun Nexus', 85000::numeric),
  ('SKU-DEMO-002', 'Bình nước Nexus', 60000::numeric),
  ('SKU-DEMO-003', 'Túi tote Nexus', 45000::numeric)
) as values_row(sku, name, cost_price)
where b.name = 'Nexus Demo'
on conflict (sku) do nothing;

insert into public.inventory_items (warehouse_id, product_id, stock)
select w.id, p.id, 100
from public.warehouses w
cross join public.products p
where w.code = 'WH-HCM-01'
on conflict (warehouse_id, product_id) do nothing;

insert into public.channel_connections (type, account_name)
values ('shopee', 'Shopee Demo')
on conflict (type, account_name) do nothing;

insert into public.channel_sku_mappings (channel_connection_id, product_id, channel_sku)
select c.id, p.id, 'SP-' || p.sku
from public.channel_connections c
cross join public.products p
where c.type = 'shopee' and c.account_name = 'Shopee Demo'
on conflict (channel_connection_id, channel_sku) do nothing;

insert into public.ledger_accounts (code, name)
values ('1100', 'Tiền và khoản phải thu'), ('4000', 'Doanh thu bán hàng'), ('5000', 'Giá vốn hàng bán')
on conflict (code) do nothing;
