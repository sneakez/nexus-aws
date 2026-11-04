-- Docker/CI lab ONLY. Never run against a real Supabase auth schema.
do $$ begin
    if current_database() <> 'nexus_lab' or to_regclass('public.orders') is not null then
        raise exception 'Bootstrap requires a fresh nexus_lab database';
    end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then
        create role authenticated;
    end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as 'select null::uuid';
