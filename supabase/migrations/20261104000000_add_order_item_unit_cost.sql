alter table public.order_items
add column unit_cost numeric(14,2)
check (unit_cost >= 0);
