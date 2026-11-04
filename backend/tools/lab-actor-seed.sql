-- Local fake profile for repository lab, not a Supabase login account.
insert into auth.users(id,email,raw_user_meta_data)
values ('0b2b7cf0-0b67-4b12-a673-e7eb359dd654','dev2@lab.example','{}'::jsonb)
on conflict (id) do nothing;
update public.profiles set role='manager', is_active=true
where id='0b2b7cf0-0b67-4b12-a673-e7eb359dd654';
