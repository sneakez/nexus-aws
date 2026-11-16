alter table public.orders
add column is_demo boolean not null default false,
add column demo_batch_id uuid;

alter table public.orders
add constraint orders_demo_batch_check
check ((is_demo and demo_batch_id is not null) or (not is_demo and demo_batch_id is null));

create index orders_demo_batch_id_idx
on public.orders (demo_batch_id)
where is_demo;
