create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  reserved_quantity numeric(14,3) not null check (reserved_quantity > 0),
  remaining_quantity numeric(14,3) not null check (remaining_quantity >= 0 and remaining_quantity <= reserved_quantity),
  state text not null check (state in ('reserved', 'released', 'committed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (order_id, warehouse_id, product_id)
);

create table public.inventory_operation_receipts (
  id uuid primary key default gen_random_uuid(),
  operation text not null check (operation in ('reserve', 'release', 'outbound', 'return_inbound')),
  idempotency_key text not null unique,
  payload jsonb not null,
  stock_transaction_id uuid references public.stock_transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
