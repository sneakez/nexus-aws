create table public.order_operation_receipts (
    idempotency_key text primary key
        check (char_length(idempotency_key) between 1 and 120),
    order_id uuid not null
        references public.orders(id) on delete cascade,
    operation_type text not null
        check (operation_type in ('cancel', 'ship')),
    request_payload jsonb not null,
    result_payload jsonb not null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create index order_operation_receipts_order_id_idx
on public.order_operation_receipts(order_id);

alter table public.order_operation_receipts enable row level security;
