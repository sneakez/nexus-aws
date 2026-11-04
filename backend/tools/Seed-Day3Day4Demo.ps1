param([string]$EnvironmentFile)
$ErrorActionPreference = 'Stop'
$warehouseId = 'a858441b-6bb0-4277-a112-d31e2eb1b17b'
$productId = '592fd15b-a6f6-473f-844d-f5d26f657da0'
$seedSql = @'
begin;
insert into public.warehouses(id,code,name)
values ('a858441b-6bb0-4277-a112-d31e2eb1b17b','DEV2-DEMO-WH','Day 3-4 demo warehouse')
on conflict (id) do nothing;
insert into public.products(id,sku,name,cost_price)
values ('592fd15b-a6f6-473f-844d-f5d26f657da0','DEV2-DEMO-E2E','Day 3-4 demo product',60000)
on conflict (id) do nothing;
with seeded as (
    insert into public.inventory_items(warehouse_id,product_id,stock)
    values ('a858441b-6bb0-4277-a112-d31e2eb1b17b','592fd15b-a6f6-473f-844d-f5d26f657da0',20)
    on conflict (warehouse_id,product_id) do nothing
    returning warehouse_id,product_id,stock
)
insert into public.stock_transactions(warehouse_id,product_id,type,quantity_delta,reference_type,idempotency_key)
select warehouse_id,product_id,'inbound',stock,'demo_seed','demo-seed-592fd15b-a6f6-473f-844d-f5d26f657da0'
from seeded;
commit;
'@
$seedSql | docker exec -i nexus-dev2-returns-lab psql -U postgres -d nexus_lab -v ON_ERROR_STOP=1 -q
if ($LASTEXITCODE -ne 0) { throw 'Cannot seed local Docker lab. Start Docker/container first.' }
$values = [ordered]@{
    baseUrl='http://localhost:5155'; managerToken=''; warehouseToken='';
    warehouseId=$warehouseId; productId=$productId;
    runPrefix=('demo-' + [Guid]::NewGuid().ToString('N'));
    feeId=[Guid]::NewGuid().ToString(); returnId=[Guid]::NewGuid().ToString()
}
$environment = @{ name='NexusOMS day 3-4 demo - fill tokens privately'; values=@(
    foreach ($item in $values.GetEnumerator()) {
        @{ key=$item.Key; value=$item.Value; enabled=$true; type=$(if ($item.Key -like '*Token') { 'secret' } else { 'default' }) }
    }
)} | ConvertTo-Json -Depth 5
if ($EnvironmentFile) {
    $fullPath = [IO.Path]::GetFullPath($EnvironmentFile)
    $stream = [IO.File]::Open($fullPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $bytes=[Text.Encoding]::UTF8.GetBytes($environment); $stream.Write($bytes,0,$bytes.Length) }
    finally { $stream.Dispose() }
    Write-Output ('Created environment: ' + $fullPath)
} else { Write-Output $environment }
Write-Output 'Local demo fixtures ready. Fill manager/warehouse tokens privately. Existing stock was not reset.'
