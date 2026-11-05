param([Guid]$OwnerUserId = [Guid]::Empty)
$ErrorActionPreference = 'Stop'
$demoSql = @'
do $$ begin
    if current_database() <> 'nexus_lab' then raise exception 'Requires nexus_lab'; end if;
end $$;
insert into public.warehouses(id,code,name) values ('5cbb62c8-0c3e-4b5d-b52f-111111111111','THINH-E2E-WH','Kho demo riêng của Thịnh') on conflict (id) do nothing;
insert into public.products(id,sku,name,cost_price) values ('5cbb62c8-0c3e-4b5d-b52f-222222222222','THINH-E2E-TSHIRT','Áo thun demo Thịnh',60000) on conflict (id) do nothing;
insert into public.customers(id,name) values ('5cbb62c8-0c3e-4b5d-b52f-333333333333','Khách demo Thịnh') on conflict (id) do nothing;
insert into public.channel_connections(id,type,account_name,status) values ('5cbb62c8-0c3e-4b5d-b52f-444444444444','shopee','THINH-E2E-SHOP','connected') on conflict (id) do nothing;
insert into public.channel_sku_mappings(channel_connection_id,product_id,channel_sku) values ('5cbb62c8-0c3e-4b5d-b52f-444444444444','5cbb62c8-0c3e-4b5d-b52f-222222222222','THINH-SHOPEE-01') on conflict do nothing;
with added as (
 insert into public.inventory_items(warehouse_id,product_id,stock) values ('5cbb62c8-0c3e-4b5d-b52f-111111111111','5cbb62c8-0c3e-4b5d-b52f-222222222222',20)
 on conflict (warehouse_id,product_id) do nothing returning warehouse_id,product_id,stock
)
insert into public.stock_transactions(warehouse_id,product_id,type,quantity_delta,reference_type,idempotency_key)
select warehouse_id,product_id,'inbound',stock,'demo_seed','thinh-e2e-initial-stock-v1' from added;
'@
$demoSql | docker exec -i nexus-dev2-returns-lab psql -U postgres -d nexus_lab -v ON_ERROR_STOP=1 --single-transaction
if ($LASTEXITCODE -ne 0) { throw 'Demo seed failed' }
if ($OwnerUserId -ne [Guid]::Empty) {
    $profileSql = "insert into auth.users(id,email,raw_user_meta_data) values ('$OwnerUserId','thinh-owner-local@demo.invalid','{}'::jsonb) on conflict (id) do nothing; update public.profiles set role='admin',is_active=true where id='$OwnerUserId';"
    $profileSql | docker exec -i nexus-dev2-returns-lab psql -U postgres -d nexus_lab -v ON_ERROR_STOP=1 --single-transaction
    if ($LASTEXITCODE -ne 0) { throw 'Local owner profile failed' }
}
Write-Output 'Demo: http://localhost:5175 | API: http://localhost:5156'
Write-Output 'Kho: THINH-E2E-WH | SKU: THINH-E2E-TSHIRT | Kenh: THINH-E2E-SHOP'
Write-Output 'Initial stock 20, unit cost 60000. Existing stock is preserved.'
Write-Output 'OwnerUserId must belong to an existing Supabase login account.'
