-- Migration 027: a private token for the scheduled IOU email job.
--
-- The schedule (pg_cron) and the iou-nudges function both need to know the same secret. Instead of copying a string into
-- the schedule's SQL, it lives in this table: the schedule reads it when it runs and the function checks it. Only the
-- service role (the function) and the database's own jobs can read it; the app and the public API cannot. The value is
-- made here, at random, and never appears in git.

create table public.app_secrets (
  name  text primary key,
  value text not null check (char_length(value) >= 32)
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
grant select on public.app_secrets to service_role;

insert into public.app_secrets (name, value) values ('iou_cron', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;
