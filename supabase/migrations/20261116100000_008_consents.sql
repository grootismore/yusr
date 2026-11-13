-- Migration 008: consent records (launch checklist items 6 and 17).
-- One row per thing a person agreed to, per version of the text: the Terms, the Privacy Policy, and
-- "I am 18 or older". The time is set by the database, not the app, and rows can only be added:
-- there is no update or delete, so the record cannot be rewritten (deleting the account removes it).
-- When the legal texts change, the app bumps its version and asks again; the old rows stay as history.

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('terms', 'privacy', 'age_18')),
  -- The version of the text agreed to, as a date (for example 2026-11-15).
  version      text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at  timestamptz not null default now(),
  unique (user_id, kind, version)
);

create index consents_user_idx on public.consents (user_id);

alter table public.consents enable row level security;

create policy consents_select_own on public.consents for select to authenticated using (user_id = (select auth.uid()));
create policy consents_insert_own on public.consents for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.consents from anon, authenticated, service_role;
grant select on public.consents to authenticated;
-- accepted_at is deliberately not insertable: it is always the server's clock.
grant insert (user_id, kind, version) on public.consents to authenticated;
