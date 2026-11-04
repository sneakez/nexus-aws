-- Access to internal inventory operations is through the authorized backend.
alter table public.inventory_reservations enable row level security;
alter table public.inventory_operation_receipts enable row level security;
