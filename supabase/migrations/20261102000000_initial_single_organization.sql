-- NexusOMS baseline: one internal organization, no tenant model.
-- Auth users are employees. Their application role lives in public.profiles.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'manager', 'warehouse');
create type public.channel_type as enum ('shopee', 'tiktok_shop', 'lazada', 'website_d2c');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.stock_tx_type as enum ('inbound', 'outbound', 'reserve', 'release', 'return_in', 'adjustment', 'transfer_out', 'transfer_in');
create type public.return_status as enum ('requested', 'approved', 'received', 'rejected', 'refunded', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default 'Nhân viên',
  role public.user_role not null default 'warehouse',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  sku text not null unique,
  name text not null,
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.warehouse_bins (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique (warehouse_id, code)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  bin_id uuid references public.warehouse_bins(id) on delete set null,
  stock numeric(14,3) not null default 0 check (stock >= 0),
  reserved numeric(14,3) not null default 0 check (reserved >= 0),
  pending_qc numeric(14,3) not null default 0 check (pending_qc >= 0),
  incoming numeric(14,3) not null default 0 check (incoming >= 0),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_id),
  check (stock >= reserved)
);

create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  type public.stock_tx_type not null,
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  reference_type text,
  reference_id uuid,
  idempotency_key text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index stock_transactions_idempotency_key_uq on public.stock_transactions(idempotency_key) where idempotency_key is not null;

create table public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  type public.channel_type not null,
  account_name text not null,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, account_name)
);

create table public.channel_sku_mappings (
  id uuid primary key default gen_random_uuid(),
  channel_connection_id uuid not null references public.channel_connections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  channel_sku text not null,
  created_at timestamptz not null default now(),
  unique (channel_connection_id, channel_sku)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_external_id_uq on public.customers(external_id) where external_id is not null;

create table public.fulfillment_waves (
  id uuid primary key default gen_random_uuid(),
  wave_number text not null unique,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'picking', 'packed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  channel_connection_id uuid references public.channel_connections(id) on delete set null,
  assigned_warehouse_id uuid references public.warehouses(id) on delete set null,
  fulfillment_wave_id uuid references public.fulfillment_waves(id) on delete set null,
  order_number text not null unique,
  status public.order_status not null default 'pending',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  shipping_fee numeric(14,2) not null default 0 check (shipping_fee >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  idempotency_key text,
  stock_restored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index orders_idempotency_key_uq on public.orders(idempotency_key) where idempotency_key is not null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_sku text,
  product_name text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  line_total numeric(14,2) not null default 0 check (line_total >= 0)
);

create table public.order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  status public.return_status not null default 'requested',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  quantity numeric(14,3) not null check (quantity > 0),
  qc_disposition text
);

create table public.order_fee_breakdowns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  fee_type text not null,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text not null unique,
  event_source text,
  reference_id uuid,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  debit_amount numeric(14,2) not null default 0 check (debit_amount >= 0),
  credit_amount numeric(14,2) not null default 0 check (credit_amount >= 0),
  check ((debit_amount = 0) <> (credit_amount = 0))
);

create table public.webhook_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  channel_connection_id uuid references public.channel_connections(id) on delete set null,
  event_type text not null,
  idempotency_key text,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);
create unique index webhook_delivery_logs_idempotency_key_uq on public.webhook_delivery_logs(idempotency_key) where idempotency_key is not null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Nhân viên'), 'warehouse')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.is_manager_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('admin', 'manager'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'brands', 'products', 'warehouses', 'warehouse_bins', 'inventory_items',
    'stock_transactions', 'channel_connections', 'channel_sku_mappings',
    'customers', 'fulfillment_waves', 'orders', 'order_items', 'order_status_log',
    'return_requests', 'return_items', 'order_fee_breakdowns', 'ledger_accounts',
    'journal_entries', 'journal_lines', 'webhook_delivery_logs', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy authenticated_read on public.%I for select to authenticated using (true)', table_name);
  end loop;
end;
$$;

-- Warehouse must not read finance journals or fee breakdowns through the browser client.
drop policy authenticated_read on public.order_fee_breakdowns;
drop policy authenticated_read on public.ledger_accounts;
drop policy authenticated_read on public.journal_entries;
drop policy authenticated_read on public.journal_lines;
create policy manager_or_admin_read on public.order_fee_breakdowns for select to authenticated using (public.is_manager_or_admin());
create policy manager_or_admin_read on public.ledger_accounts for select to authenticated using (public.is_manager_or_admin());
create policy manager_or_admin_read on public.journal_entries for select to authenticated using (public.is_manager_or_admin());
create policy manager_or_admin_read on public.journal_lines for select to authenticated using (public.is_manager_or_admin());

alter table public.profiles enable row level security;
create policy profile_read_self_or_admin on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profile_update_admin_only on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create trigger brands_touch_updated_at before update on public.brands for each row execute procedure public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products for each row execute procedure public.touch_updated_at();
create trigger warehouses_touch_updated_at before update on public.warehouses for each row execute procedure public.touch_updated_at();
create trigger channel_connections_touch_updated_at before update on public.channel_connections for each row execute procedure public.touch_updated_at();
create trigger customers_touch_updated_at before update on public.customers for each row execute procedure public.touch_updated_at();
create trigger fulfillment_waves_touch_updated_at before update on public.fulfillment_waves for each row execute procedure public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders for each row execute procedure public.touch_updated_at();
create trigger return_requests_touch_updated_at before update on public.return_requests for each row execute procedure public.touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure public.touch_updated_at();
