alter table public.webhook_delivery_logs
add column retry_count integer not null default 0 check (retry_count >= 0),
add column retryable boolean not null default false,
add column next_retry_at timestamptz;

create index webhook_delivery_logs_retry_due_idx
on public.webhook_delivery_logs (next_retry_at)
where status = 'failed' and retryable;
