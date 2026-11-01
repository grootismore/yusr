-- Migration 006: user rights (PRD §9, launch checklist 6, 17, 20).
--   consents          timestamped record of the terms, privacy and 18+ confirmations
--   deletion_requests account deletion with a 7-day grace period, then a hard delete
--   export_my_data()  the caller's own data as JSON, secrets decrypted for them only
-- Deleting an auth user cascades through every table; the debt and note triggers
-- remove the matching Vault secrets, so nothing encrypted is left behind.

-- ------------------------------------------------------------------ consents

create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('terms', 'privacy', 'age_18')),
  -- Which version of the document was shown, e.g. '2026-11-01'.
  version     text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  unique (user_id, kind, version)
);

alter table public.consents enable row level security;
alter table public.consents force row level security;

-- Append-only for the owner: they can read their records and add one, never change or erase it
-- (it is erased only when the whole account is deleted).
create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()));
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
grant insert (kind, version) on public.consents to authenticated;
-- user_id defaults to the caller so the client never has to send it.
alter table public.consents alter column user_id set default auth.uid();

-- Sign-up sends the three confirmations in the user metadata; record them with the server's clock.
-- A missing one is simply not recorded (the app refuses to submit without all three).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c jsonb := coalesce(new.raw_user_meta_data -> 'consents', '{}'::jsonb);
  k text;
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.release_cases (user_id) values (new.id);
  if jsonb_typeof(c) = 'object' then
    foreach k in array array['terms', 'privacy', 'age_18'] loop
      if jsonb_typeof(c -> k) = 'string' and char_length(c ->> k) between 1 and 40 then
        insert into public.consents (user_id, kind, version) values (new.id, k, c ->> k);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------- account deletion

create table public.deletion_requests (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null
);

alter table public.deletion_requests enable row level security;
alter table public.deletion_requests force row level security;
create policy deletion_requests_select on public.deletion_requests for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.deletion_requests from anon, authenticated;
grant select on public.deletion_requests to authenticated;

create function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  due timestamptz;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.deletion_requests (user_id, scheduled_for)
  values (uid, now() + interval '7 days')
  -- Asking twice keeps the original date; it never extends the wait.
  on conflict (user_id) do update set user_id = excluded.user_id
  returning scheduled_for into due;
  return due;
end;
$$;

create function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.deletion_requests where user_id = (select auth.uid());
end;
$$;

-- Runs from pg_cron only (never callable by a client).
create function public.purge_due_account_deletions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  with due as (
    delete from auth.users
    where id in (select user_id from public.deletion_requests where scheduled_for <= now())
    returning 1
  )
  select count(*) into removed from due;
  return removed;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon, authenticated;
revoke all on function public.cancel_account_deletion() from public, anon, authenticated;
revoke all on function public.purge_due_account_deletions() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-due-account-deletions', '17 3 * * *', 'select public.purge_due_account_deletions()');

-- ---------------------------------------------------------------- export

create function public.export_my_data()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = uid),
    'accounts', coalesce((select jsonb_agg(to_jsonb(t)) from public.accounts t where t.user_id = uid), '[]'),
    'categories', coalesce((select jsonb_agg(to_jsonb(t)) from public.categories t where t.user_id = uid), '[]'),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t)) from public.transactions t where t.user_id = uid), '[]'),
    'receivables', coalesce((select jsonb_agg(to_jsonb(t)) from public.receivables t where t.user_id = uid), '[]'),
    'commitments', coalesce((select jsonb_agg(to_jsonb(t)) from public.commitments t where t.user_id = uid), '[]'),
    'recurring_items', coalesce((select jsonb_agg(to_jsonb(t)) from public.recurring_items t where t.user_id = uid), '[]'),
    'debts', coalesce((
      select jsonb_agg(
        (to_jsonb(d) - 'reference_secret_id' - 'notes_secret_id') || jsonb_build_object(
          'reference_no', (select s.decrypted_secret from vault.decrypted_secrets s
                           where s.id = d.reference_secret_id and s.name = 'debt:' || d.id || ':reference'),
          'notes', (select s.decrypted_secret from vault.decrypted_secrets s
                    where s.id = d.notes_secret_id and s.name = 'debt:' || d.id || ':notes')))
      from public.debts d where d.user_id = uid), '[]'),
    'wasiyyah_note', (select s.decrypted_secret from public.wasiyyah_notes n
                      join vault.decrypted_secrets s on s.id = n.note_secret_id and s.name = 'wasiyyah:' || uid || ':note'
                      where n.user_id = uid),
    -- The invite token hash is a credential for the invite link, so it is left out.
    'trusted_contacts', coalesce((select jsonb_agg(to_jsonb(t) - 'invite_token_hash') from public.trusted_contacts t where t.user_id = uid), '[]'),
    'audit_log', coalesce((select jsonb_agg(to_jsonb(t)) from public.audit_log t where t.user_id = uid), '[]'),
    'consents', coalesce((select jsonb_agg(to_jsonb(t)) from public.consents t where t.user_id = uid), '[]')
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;
