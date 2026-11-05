-- Preserve the source of existing simulator webhook orders so their status is read-only in OMS.
update public.orders o
set channel_connection_id = c.id
from public.channel_connections c
where o.channel_connection_id is null
  and o.idempotency_key like 'webhook:' || replace(c.id::text, '-', '') || ':%';
