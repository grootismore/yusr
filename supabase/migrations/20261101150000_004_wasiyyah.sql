-- Migration 004: Wasiyyah & Amanah register foundation (PRD §5, §8, §9).
-- instruction note (encrypted), trusted contacts, release cases, audit log.
--
-- Security model
-- * Trusted contacts can read an owner's register ONLY while that owner's release_case is
--   'released'. That is enforced here, in the database: release_cases has no client write
--   path at all, and contacts read through get_register_for_contact(), a security-definer
--   function that re-checks the case state and the caller's verified email every time.
-- * The release state machine (v1.1) will be a server function using the service role.
--   Nothing in this migration moves a case out of 'active'.
-- * The audit log is written only by database triggers/functions. Clients can read their own
--   entries but cannot insert, edit or delete any (no grants, RLS on).
-- * The instruction note is encrypted at rest in Supabase Vault (same pattern as debt secrets).
--   Honest limit (PRD §9): the project owner / database admin can still decrypt.

-- ----------------------------------------------------------------- audit log

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Who caused it. Never free text from a client.
  actor       text not null check (actor in ('user', 'contact', 'system')),
  event       text not null check (event in (
    'contact_invited', 'contact_accepted', 'contact_declined', 'contact_revoked',
    'note_changed', 'register_shared', 'register_viewed'
  )),
  case_id     uuid,
  -- Never contains amounts, names or note text: ids and section names only.
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

-- -------------------------------------------------------------- release cases
-- One per user. Created active; only a server function (v1.1) may change the state.

create table public.release_cases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  state         text not null default 'active'
                check (state in ('active', 'quiet', 'second_checkin', 'contacts_asked', 'released', 'cancelled')),
  started_at    timestamptz not null default now(),
  away_until    timestamptz,
  released_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((state = 'released') = (released_at is not null))
);

create trigger release_cases_updated_at before update on public.release_cases
  for each row execute function public.set_updated_at();

-- Every user gets a case; existing users are backfilled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.release_cases (user_id) values (new.id);
  return new;
end;
$$;

insert into public.release_cases (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ------------------------------------------------------------ trusted contacts

create table public.trusted_contacts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 100),
  -- How the owner wants to appear on the invite page ("Aisha invited you..."). Optional.
  inviter_name      text check (char_length(inviter_name) between 1 and 100),
  email             text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone             text check (char_length(phone) <= 30),
  status            text not null default 'invited' check (status in ('invited', 'accepted', 'revoked')),
  -- SHA-256 (hex) of the invite token. The raw token only ever lives in the link the owner shares.
  invite_token_hash text check (invite_token_hash ~ '^[0-9a-f]{64}$'),
  invite_expires_at timestamptz not null,
  consented_at      timestamptz not null,
  accepted_at       timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id)
);

create index trusted_contacts_user_idx on public.trusted_contacts (user_id);
-- The same person cannot be invited twice at once.
create unique index trusted_contacts_user_email_idx on public.trusted_contacts (user_id, lower(email))
  where status <> 'revoked';

create trigger trusted_contacts_updated_at before update on public.trusted_contacts
  for each row execute function public.set_updated_at();

create function public.trusted_contacts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  client boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    -- Consent must be explicit from the client; the time is stamped by the server.
    if new.consented_at is null then
      raise exception 'consent is required to invite a trusted contact' using errcode = '23514';
    end if;
    if new.invite_token_hash is null then
      raise exception 'an invite token is required' using errcode = '23514';
    end if;
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if (select count(*) from public.trusted_contacts
         where user_id = new.user_id and status <> 'revoked') >= 3 then
      raise exception 'at most 3 trusted contacts' using errcode = '23514';
    end if;
    perform set_config('yusr.contact_actor', 'user', true);
    perform set_config('yusr.contact_event', 'contact_invited', true);
    new.status := 'invited';
    new.consented_at := now();
    new.invite_expires_at := now() + interval '7 days';
    new.accepted_at := null;
    new.revoked_at := null;
    return new;
  end if;

  -- UPDATE
  if client then
    -- A client may only revoke a contact; every other column is frozen.
    if new.status <> 'revoked' or old.status = 'revoked' then
      raise exception 'contacts can only be revoked' using errcode = '42501';
    end if;
    new.name := old.name;
    new.email := old.email;
    new.phone := old.phone;
    new.invite_token_hash := null;
    new.invite_expires_at := old.invite_expires_at;
    new.consented_at := old.consented_at;
    new.accepted_at := old.accepted_at;
    new.revoked_at := now();
    perform set_config('yusr.contact_actor', 'user', true);
    perform set_config('yusr.contact_event', 'contact_revoked', true);
  else
    -- Server side (invite function): accepting or declining spends the token.
    if new.status = 'accepted' then
      new.accepted_at := now();
      new.invite_token_hash := null;
      perform set_config('yusr.contact_actor', 'contact', true);
      perform set_config('yusr.contact_event', 'contact_accepted', true);
    elsif new.status = 'revoked' and old.status <> 'revoked' then
      new.revoked_at := now();
      new.invite_token_hash := null;
      -- Revoked from the server while still only invited means the contact declined.
      perform set_config('yusr.contact_actor', 'contact', true);
      perform set_config('yusr.contact_event', case when old.status = 'invited' then 'contact_declined' else 'contact_revoked' end, true);
    end if;
  end if;
  return new;
end;
$$;

create trigger trusted_contacts_guard_trg before insert or update on public.trusted_contacts
  for each row execute function public.trusted_contacts_guard();

-- The audit trail for contacts is written by the database, not the client. The guard trigger
-- (which runs as the caller) decides who acted and what happened; this definer function only
-- records it. (current_user inside a definer function is its owner, so it cannot tell.)
create function public.trusted_contacts_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := current_setting('yusr.contact_actor', true);
  event text := current_setting('yusr.contact_event', true);
begin
  if actor is not null and event is not null and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    insert into public.audit_log (user_id, actor, event, meta)
    values (new.user_id, actor, event, jsonb_build_object('contact_id', new.id));
  end if;
  perform set_config('yusr.contact_actor', '', true);
  perform set_config('yusr.contact_event', '', true);
  return new;
end;
$$;

create trigger trusted_contacts_audit_trg after insert or update on public.trusted_contacts
  for each row execute function public.trusted_contacts_audit();

-- Throttle for the public invite-accept endpoint (read/written only by that server function).
create table public.invite_attempts (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_idx on public.invite_attempts (ip_hash, attempted_at desc);

-- ------------------------------------------------------- instruction note

create table public.wasiyyah_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users (id) on delete cascade,
  note_secret_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger wasiyyah_notes_updated_at before update on public.wasiyyah_notes
  for each row execute function public.set_updated_at();

create function public.set_wasiyyah_note(p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  existing public.wasiyyah_notes;
  secret_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if char_length(coalesce(p_note, '')) > 5000 then
    raise exception 'note too long' using errcode = '22001';
  end if;

  select * into existing from public.wasiyyah_notes where user_id = uid;
  secret_id := existing.note_secret_id;

  if coalesce(p_note, '') = '' then
    if secret_id is not null then delete from vault.secrets where id = secret_id; secret_id := null; end if;
  elsif secret_id is null then
    secret_id := vault.create_secret(p_note, 'wasiyyah:' || uid || ':note');
  else
    perform vault.update_secret(secret_id, p_note);
  end if;

  insert into public.wasiyyah_notes (user_id, note_secret_id) values (uid, secret_id)
  on conflict (user_id) do update set note_secret_id = excluded.note_secret_id;

  insert into public.audit_log (user_id, actor, event) values (uid, 'user', 'note_changed');
end;
$$;

create function public.get_wasiyyah_note()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select s.decrypted_secret into result
  from public.wasiyyah_notes n
  join vault.decrypted_secrets s on s.id = n.note_secret_id and s.name = 'wasiyyah:' || uid || ':note'
  where n.user_id = uid;
  return result;
end;
$$;

create function public.delete_wasiyyah_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = old.note_secret_id;
  return old;
end;
$$;

create trigger wasiyyah_notes_delete_secret after delete on public.wasiyyah_notes
  for each row execute function public.delete_wasiyyah_secret();

-- Record that the owner chose to share their register (the content never goes in the log).
create function public.log_register_shared(p_sections text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if cardinality(p_sections) = 0 or not (p_sections <@ array['debts', 'receivables', 'giving', 'note']) then
    raise exception 'unknown section' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, actor, event, meta)
  values (uid, 'user', 'register_shared', jsonb_build_object('sections', to_jsonb(p_sections)));
end;
$$;

-- ------------------------------------------ the register, for a trusted contact

-- The ONLY way a contact can read an owner's register: caller must be a signed-in user whose
-- email is verified, matches an ACCEPTED contact of the owner, and the owner's case must be
-- 'released'. Amounts are derived server-side so they match what the owner sees.
create function public.get_register_for_contact(p_owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  result jsonb;
begin
  select lower(u.email) into caller_email
  from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;

  if caller_email is null
     or not exists (
       select 1 from public.trusted_contacts c
       where c.user_id = p_owner and lower(c.email) = caller_email and c.status = 'accepted')
     or not exists (
       select 1 from public.release_cases r where r.user_id = p_owner and r.state = 'released')
  then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.audit_log (user_id, actor, event, meta)
  values (p_owner, 'contact', 'register_viewed', '{}'::jsonb);

  select jsonb_build_object(
    'debts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'lender', d.lender,
        'balance_laari', greatest(0, d.balance_laari - coalesce((
            select sum(t.amount_laari) from public.transactions t
            where t.debt_id = d.id and t.deleted_at is null), 0)),
        'reference_no', (select s.decrypted_secret from vault.decrypted_secrets s
                          where s.id = d.reference_secret_id and s.name = 'debt:' || d.id || ':reference'),
        'notes', (select s.decrypted_secret from vault.decrypted_secrets s
                   where s.id = d.notes_secret_id and s.name = 'debt:' || d.id || ':notes')
      ) order by d.lender)
      from public.debts d
      where d.user_id = p_owner and d.deleted_at is null
        and d.balance_laari - coalesce((
          select sum(t.amount_laari) from public.transactions t
          where t.debt_id = d.id and t.deleted_at is null), 0) > 0
    ), '[]'::jsonb),
    'receivables', coalesce((
      select jsonb_agg(jsonb_build_object('debtor', r.debtor, 'amount_laari', r.amount_laari, 'due_on', r.due_on) order by r.debtor)
      from public.receivables r where r.user_id = p_owner and r.deleted_at is null
    ), '[]'::jsonb),
    -- Pending giving only: type, amount and schedule. The private recipient note stays private.
    'giving', coalesce((
      select jsonb_agg(jsonb_build_object('type', c.type, 'amount_laari', c.amount_laari, 'schedule', c.schedule) order by c.type)
      from public.commitments c where c.user_id = p_owner and c.deleted_at is null and c.active
    ), '[]'::jsonb),
    'note', (select s.decrypted_secret from public.wasiyyah_notes n
              join vault.decrypted_secrets s on s.id = n.note_secret_id and s.name = 'wasiyyah:' || p_owner || ':note'
              where n.user_id = p_owner)
  ) into result;

  return result;
end;
$$;

-- ------------------------------------------------------------------- grants

revoke all on function public.trusted_contacts_guard() from public, anon, authenticated;
revoke all on function public.trusted_contacts_audit() from public, anon, authenticated;
revoke all on function public.delete_wasiyyah_secret() from public, anon, authenticated;
revoke all on function public.set_wasiyyah_note(text) from public, anon, authenticated;
revoke all on function public.get_wasiyyah_note() from public, anon, authenticated;
revoke all on function public.log_register_shared(text[]) from public, anon, authenticated;
revoke all on function public.get_register_for_contact(uuid) from public, anon, authenticated;
grant execute on function public.set_wasiyyah_note(text) to authenticated;
grant execute on function public.get_wasiyyah_note() to authenticated;
grant execute on function public.log_register_shared(text[]) to authenticated;
grant execute on function public.get_register_for_contact(uuid) to authenticated;

revoke all on public.audit_log, public.release_cases, public.trusted_contacts, public.wasiyyah_notes, public.invite_attempts
  from anon, authenticated;

-- Read-only for owners.
grant select on public.audit_log, public.release_cases, public.wasiyyah_notes to authenticated;
-- Contacts: owners may add one and revoke one; nothing else (the guard trigger freezes the rest).
grant select on public.trusted_contacts to authenticated;
grant insert (id, user_id, name, inviter_name, email, phone, invite_token_hash, invite_expires_at, consented_at)
  on public.trusted_contacts to authenticated;
grant update (status) on public.trusted_contacts to authenticated;
-- invite_attempts: no client access at all.

-- --------------------------------------------------------------------- RLS

alter table public.audit_log        enable row level security;
alter table public.release_cases    enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.wasiyyah_notes   enable row level security;
alter table public.invite_attempts  enable row level security;

alter table public.audit_log        force row level security;
alter table public.release_cases    force row level security;
alter table public.trusted_contacts force row level security;
alter table public.wasiyyah_notes   force row level security;
alter table public.invite_attempts  force row level security;

create policy audit_log_select_own on public.audit_log
  for select to authenticated using (user_id = (select auth.uid()));
create policy release_cases_select_own on public.release_cases
  for select to authenticated using (user_id = (select auth.uid()));
create policy wasiyyah_notes_select_own on public.wasiyyah_notes
  for select to authenticated using (user_id = (select auth.uid()));

create policy trusted_contacts_select_own on public.trusted_contacts
  for select to authenticated using (user_id = (select auth.uid()));
create policy trusted_contacts_insert_own on public.trusted_contacts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy trusted_contacts_update_own on public.trusted_contacts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- (no delete policy: a contact is revoked, never erased, so the audit trail stays meaningful;
--  deleting the whole account still removes everything by cascade)

-- invite_attempts has RLS on and no policy: only the service role (invite function) can use it.
