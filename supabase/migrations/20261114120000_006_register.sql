-- Migration 006: Wasiyyah & Amanah register, trusted contacts and the release ladder.
--
-- Security model (what this migration guarantees, in the database, not in app code)
--  * Trusted contacts have NO client policy on any table. They can read a register only through
--    get_register_for_contact(), which re-checks their verified email, their accepted status and
--    that the owner's ladder is 'released', every single time.
--  * The ladder (release_checkins) has no client write path. A trigger allows only these moves:
--    active -> quiet -> second_checkin -> contacts_asked -> released, and back to active. It
--    enforces the waiting times itself, and refuses 'released' unless release_eligible() is true:
--    the kill switch is on AND the contacts have confirmed (2 or more contacts: 2 'passed'
--    answers; 1 contact: that contact's 'passed' answer plus 14 days without the owner
--    responding) AND nobody answered 'fine'. Inactivity alone can never release anything.
--  * release_config.enabled is false. Turning the flow on is a deliberate manual step; this
--    migration does not schedule anything.
--  * The audit log is written only by database triggers and functions. Never contains amounts,
--    names or note text: ids and step names only.
--  * Register item details are encrypted at rest in Supabase Vault. Honest limit: the project
--    owner or a database admin can still decrypt (stated in the privacy policy).

-- ---------------------------------------------------------------- audit log

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  actor       text not null check (actor in ('user', 'contact', 'system')),
  event       text not null check (event in (
    'contact_invited', 'contact_accepted', 'contact_declined', 'contact_revoked',
    'register_item_changed', 'register_viewed',
    'checkin_okay', 'ladder_advanced', 'notice_sent', 'released', 'release_blocked',
    'contact_answered', 'answer_withdrawn', 'away_set', 'away_ended'
  )),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

-- ------------------------------------------------------------ trusted contacts

create table public.trusted_contacts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 100),
  -- How the owner wants to appear on the invite page. Optional.
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
  -- Set by the guard trigger on every write, read by the audit trigger: who did it and what it was.
  -- Kept on the row (not in session settings) so multi-row statements are attributed correctly.
  audit_actor       text,
  audit_event       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id)
);

create index trusted_contacts_user_idx on public.trusted_contacts (user_id);
create unique index trusted_contacts_user_email_idx on public.trusted_contacts (user_id, lower(email)) where status <> 'revoked';

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
    if new.consented_at is null then
      raise exception 'consent is required to invite a trusted contact' using errcode = '23514';
    end if;
    if new.invite_token_hash is null then
      raise exception 'an invite token is required' using errcode = '23514';
    end if;
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if (select count(*) from public.trusted_contacts where user_id = new.user_id and status <> 'revoked') >= 3 then
      raise exception 'at most 3 trusted contacts' using errcode = '23514';
    end if;
    new.audit_actor := 'user';
    new.audit_event := 'contact_invited';
    new.status := 'invited';
    new.consented_at := now();
    new.invite_expires_at := now() + interval '7 days';
    new.accepted_at := null;
    new.revoked_at := null;
    return new;
  end if;

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
    new.audit_actor := 'user';
    new.audit_event := 'contact_revoked';
  else
    -- Server side (accept-invite function): accepting or declining spends the token.
    if new.status = 'accepted' then
      new.accepted_at := now();
      new.invite_token_hash := null;
      new.audit_actor := 'contact';
      new.audit_event := 'contact_accepted';
    elsif new.status = 'revoked' and old.status <> 'revoked' then
      new.revoked_at := now();
      new.invite_token_hash := null;
      new.audit_actor := 'contact';
      new.audit_event := case when old.status = 'invited' then 'contact_declined' else 'contact_revoked' end;
    end if;
  end if;
  return new;
end;
$$;

create trigger trusted_contacts_guard_trg before insert or update on public.trusted_contacts
  for each row execute function public.trusted_contacts_guard();

-- Records who did what. The guard (running as the caller) decides actor and event and stamps them on
-- the row; this definer function only writes the log, so clients never need any right on audit_log.
create function public.trusted_contacts_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.audit_actor is not null and new.audit_event is not null
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    insert into public.audit_log (user_id, actor, event, meta)
    values (new.user_id, new.audit_actor, new.audit_event, jsonb_build_object('contact_id', new.id));
  end if;
  return new;
end;
$$;

create trigger trusted_contacts_audit_trg after insert or update on public.trusted_contacts
  for each row execute function public.trusted_contacts_audit();

-- Throttle for the public invite-accept endpoint (used only by that server function).
create table public.invite_attempts (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_idx on public.invite_attempts (ip_hash, attempted_at desc);

-- ------------------------------------------------------------- register items
-- What the family needs to know: debts owed, money owed to the person, pending giving, trusts
-- and wishes. Never store bank passwords, PINs, card numbers or ID numbers (the app says so).

create table public.register_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  kind               text not null check (kind in ('debt', 'receivable', 'giving', 'trust', 'wish')),
  title              text not null check (char_length(title) between 1 and 120),
  counterparty       text check (char_length(counterparty) <= 120),
  amount_laari       bigint check (amount_laari between 0 and 9007199254740991),
  -- Free-text details, encrypted in Vault. Read and written only through the functions below.
  details_secret_id  uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index register_items_user_idx on public.register_items (user_id);
create trigger register_items_updated_at before update on public.register_items
  for each row execute function public.set_updated_at();

create function public.save_register_item(
  p_id uuid, p_kind text, p_title text, p_counterparty text, p_amount_laari bigint, p_details text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item_id uuid;
  secret_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if char_length(coalesce(p_details, '')) > 2000 then
    raise exception 'details too long' using errcode = '22001';
  end if;

  if p_id is null then
    item_id := gen_random_uuid();
    insert into public.register_items (id, user_id, kind, title, counterparty, amount_laari)
    values (item_id, uid, p_kind, p_title, p_counterparty, p_amount_laari);
  else
    -- Updating: the item must already be this user's.
    select i.details_secret_id into secret_id from public.register_items i where i.id = p_id and i.user_id = uid;
    if not found then
      raise exception 'not found' using errcode = '42501';
    end if;
    item_id := p_id;
    update public.register_items
       set kind = p_kind, title = p_title, counterparty = p_counterparty, amount_laari = p_amount_laari
     where id = item_id and user_id = uid;
  end if;

  if coalesce(p_details, '') = '' then
    if secret_id is not null then
      delete from vault.secrets where id = secret_id;
      update public.register_items set details_secret_id = null where id = item_id;
    end if;
  elsif secret_id is null then
    update public.register_items set details_secret_id = vault.create_secret(p_details, 'register:' || item_id || ':details') where id = item_id;
  else
    perform vault.update_secret(secret_id, p_details);
  end if;

  insert into public.audit_log (user_id, actor, event, meta)
  values (uid, 'user', 'register_item_changed', jsonb_build_object('item_id', item_id));
  return item_id;
end;
$$;

create function public.get_register_item_details(p_id uuid)
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
  from public.register_items i
  join vault.decrypted_secrets s on s.id = i.details_secret_id and s.name = 'register:' || i.id || ':details'
  where i.id = p_id and i.user_id = uid;
  return result;
end;
$$;

-- Deleting an item (clients may delete their own rows) also deletes its encrypted details.
create function public.delete_register_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.details_secret_id is not null then
    delete from vault.secrets where id = old.details_secret_id;
  end if;
  insert into public.audit_log (user_id, actor, event, meta)
  values (old.user_id, 'user', 'register_item_changed', jsonb_build_object('item_id', old.id, 'deleted', true));
  return old;
end;
$$;

create trigger register_items_delete_secret after delete on public.register_items
  for each row execute function public.delete_register_secret();

-- ------------------------------------------------------------- release ladder

-- One row of configuration. The flow is OFF. Turning it on is a manual, deliberate step:
--   update public.release_config set enabled = true;
create table public.release_config (
  id          smallint primary key check (id = 1),
  enabled     boolean not null default false,
  updated_at  timestamptz not null default now()
);
insert into public.release_config (id, enabled) values (1, false);

-- One row per user: where they are on the check-in ladder.
create table public.release_checkins (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  state              text not null default 'active'
                     check (state in ('active', 'quiet', 'second_checkin', 'contacts_asked', 'released')),
  last_active_at     timestamptz not null default now(),
  quiet_at           timestamptz,
  second_checkin_at  timestamptz,
  contacts_asked_at  timestamptz,
  released_at        timestamptz,
  -- Away mode (Hajj, Umrah, travel, hospital): pauses the ladder for at most 90 days.
  away_started_at    timestamptz,
  away_until         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((state = 'released') = (released_at is not null)),
  check (away_until is null or (away_started_at is not null and away_until <= away_started_at + interval '90 days'))
);

create trigger release_checkins_updated_at before update on public.release_checkins
  for each row execute function public.set_updated_at();

-- A trusted contact's answer when asked. 'fine' cancels the flow; 'passed' counts toward release.
create table public.release_confirmations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  contact_id    uuid not null,
  answer        text not null check (answer in ('fine', 'passed')),
  answered_at   timestamptz not null default now(),
  -- Contacts can change their mind until release; a withdrawn answer no longer counts.
  withdrawn_at  timestamptz,
  unique (user_id, contact_id),
  foreign key (contact_id, user_id) references public.trusted_contacts (id, user_id) on delete cascade
);

-- Every user gets a profile and a ladder row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.release_checkins (user_id) values (new.id);
  return new;
end;
$$;

insert into public.release_checkins (user_id) select id from auth.users on conflict (user_id) do nothing;

-- May this person's register be released right now? The single source of truth for that
-- question, used by the guard trigger below.
create function public.release_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select enabled from public.release_config where id = 1), false)
    and exists (
      select 1 from public.release_checkins r
      where r.user_id = p_user and r.state = 'contacts_asked' and (r.away_until is null or r.away_until <= now()))
    -- Any contact saying "they are fine" stops it.
    and not exists (
      select 1 from public.release_confirmations c
      join public.trusted_contacts t on t.id = c.contact_id and t.status = 'accepted'
      where c.user_id = p_user and c.answer = 'fine' and c.withdrawn_at is null)
    and case (select count(*) from public.trusted_contacts t where t.user_id = p_user and t.status = 'accepted')
      when 0 then false
      -- One contact: their own "passed" answer, and a further 14 days without the owner responding.
      when 1 then
        exists (select 1 from public.release_confirmations c join public.trusted_contacts t on t.id = c.contact_id and t.status = 'accepted'
                where c.user_id = p_user and c.answer = 'passed' and c.withdrawn_at is null)
        and exists (select 1 from public.release_checkins r where r.user_id = p_user and r.contacts_asked_at <= now() - interval '14 days')
      -- Two or more: two different contacts have confirmed.
      else
        (select count(distinct c.contact_id) from public.release_confirmations c
         join public.trusted_contacts t on t.id = c.contact_id and t.status = 'accepted'
         where c.user_id = p_user and c.answer = 'passed' and c.withdrawn_at is null) >= 2
    end;
$$;

create function public.release_checkins_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Clients never write here (they hold no privileges either; this is the second lock).
  if current_user in ('authenticated', 'anon') then
    raise exception 'the check-in ladder cannot be changed by clients' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.state <> 'active' then
      raise exception 'a ladder starts active' using errcode = '23514';
    end if;
    return new;
  end if;

  if old.state = 'released' then
    raise exception 'a released case is frozen' using errcode = '23514';
  end if;

  if new.state = old.state then
    return new;
  end if;

  -- Back to active: the person is here (or cancelled). Clears the ladder.
  if new.state = 'active' then
    new.quiet_at := null;
    new.second_checkin_at := null;
    new.contacts_asked_at := null;
    return new;
  end if;

  if (old.state, new.state) not in (
    ('active', 'quiet'), ('quiet', 'second_checkin'), ('second_checkin', 'contacts_asked'), ('contacts_asked', 'released')
  ) then
    raise exception 'invalid ladder step % -> %', old.state, new.state using errcode = '23514';
  end if;

  if old.away_until is not null and old.away_until > now() then
    raise exception 'away mode is on' using errcode = '23514';
  end if;

  -- The waiting times are enforced here, not trusted to the caller.
  if new.state = 'quiet' then
    if greatest(old.last_active_at, coalesce(old.away_until, old.last_active_at)) > now() - interval '30 days' then
      raise exception 'not yet 30 days of inactivity' using errcode = '23514';
    end if;
    new.quiet_at := now();
  elsif new.state = 'second_checkin' then
    if old.quiet_at is null or old.quiet_at > now() - interval '7 days' then
      raise exception 'second check-in is 7 days after the first' using errcode = '23514';
    end if;
    new.second_checkin_at := now();
  elsif new.state = 'contacts_asked' then
    if old.second_checkin_at is null or old.second_checkin_at > now() - interval '7 days' then
      raise exception 'contacts are asked 7 days after the second check-in' using errcode = '23514';
    end if;
    new.contacts_asked_at := now();
  elsif new.state = 'released' then
    if not public.release_eligible(old.user_id) then
      raise exception 'release is not allowed: needs the kill switch on and confirmation from trusted contacts' using errcode = '23514';
    end if;
    new.released_at := now();
  end if;
  return new;
end;
$$;

create trigger release_checkins_guard_trg before insert or update on public.release_checkins
  for each row execute function public.release_checkins_guard();

-- Every ladder move is written to the audit log by the database itself.
create function public.release_checkins_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state is distinct from old.state then
    insert into public.audit_log (user_id, actor, event, meta)
    values (new.user_id, 'system',
            case when new.state = 'released' then 'released' else 'ladder_advanced' end,
            jsonb_build_object('from', old.state, 'to', new.state));
  end if;
  return new;
end;
$$;

create trigger release_checkins_audit_trg after update on public.release_checkins
  for each row execute function public.release_checkins_audit();

-- ------------------------------------------------ owner actions (called by the app)

-- "I'm okay": any activity resets the ladder. Opening the app calls this.
create function public.record_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  prev text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select state into prev from public.release_checkins where user_id = uid for update;
  if prev is null or prev = 'released' then
    return;
  end if;
  update public.release_checkins set last_active_at = now(), state = 'active' where user_id = uid;
  if prev <> 'active' then
    -- Cancelling the flow: any answers given so far stop counting.
    update public.release_confirmations set withdrawn_at = now() where user_id = uid and withdrawn_at is null;
    insert into public.audit_log (user_id, actor, event, meta)
    values (uid, 'user', 'checkin_okay', jsonb_build_object('from', prev));
  end if;
end;
$$;

-- Pause the ladder for 1 to 90 days (0 ends away mode).
create function public.set_away_mode(p_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  prev text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_days is null or p_days < 0 or p_days > 90 then
    raise exception 'away mode is 0 to 90 days' using errcode = '22023';
  end if;
  select state into prev from public.release_checkins where user_id = uid for update;
  if prev is null or prev = 'released' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_days = 0 then
    update public.release_checkins set away_started_at = null, away_until = null where user_id = uid;
    insert into public.audit_log (user_id, actor, event) values (uid, 'user', 'away_ended');
  else
    update public.release_checkins
       set state = 'active', last_active_at = now(), away_started_at = now(), away_until = now() + make_interval(days => p_days)
     where user_id = uid;
    update public.release_confirmations set withdrawn_at = now() where user_id = uid and withdrawn_at is null;
    insert into public.audit_log (user_id, actor, event, meta)
    values (uid, 'user', 'away_set', jsonb_build_object('days', p_days));
  end if;
end;
$$;

-- --------------------------------------------- trusted contact actions (their web page)

-- The caller's verified email, or null.
create function public.verified_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email) from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;

-- Which people has this contact been asked about, or released?
create function public.contact_cases()
returns table (owner_id uuid, inviter_name text, state text, my_answer text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id, c.inviter_name, r.state,
         (select f.answer from public.release_confirmations f where f.contact_id = c.id and f.withdrawn_at is null)
  from public.trusted_contacts c
  join public.release_checkins r on r.user_id = c.user_id
  where lower(c.email) = public.verified_email() and c.status = 'accepted' and r.state in ('contacts_asked', 'released');
$$;

-- "They're fine" or "They have passed away". Only while the contacts are being asked.
create function public.answer_release_check(p_owner uuid, p_answer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact uuid;
begin
  select c.id into contact from public.trusted_contacts c
  where c.user_id = p_owner and lower(c.email) = public.verified_email() and c.status = 'accepted';
  if contact is null
     or not exists (select 1 from public.release_checkins r where r.user_id = p_owner and r.state = 'contacts_asked') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_answer not in ('fine', 'passed') then
    raise exception 'answer must be fine or passed' using errcode = '22023';
  end if;
  insert into public.release_confirmations (user_id, contact_id, answer) values (p_owner, contact, p_answer)
  on conflict (user_id, contact_id) do update set answer = excluded.answer, answered_at = now(), withdrawn_at = null;
  insert into public.audit_log (user_id, actor, event, meta)
  values (p_owner, 'contact', 'contact_answered', jsonb_build_object('contact_id', contact, 'answer', p_answer));
end;
$$;

-- A contact can change their mind until release.
create function public.withdraw_release_answer(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact uuid;
begin
  select c.id into contact from public.trusted_contacts c
  where c.user_id = p_owner and lower(c.email) = public.verified_email() and c.status = 'accepted';
  if contact is null
     or not exists (select 1 from public.release_checkins r where r.user_id = p_owner and r.state = 'contacts_asked') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.release_confirmations set withdrawn_at = now()
   where user_id = p_owner and contact_id = contact and withdrawn_at is null;
  insert into public.audit_log (user_id, actor, event, meta)
  values (p_owner, 'contact', 'answer_withdrawn', jsonb_build_object('contact_id', contact));
end;
$$;

-- The ONLY way a contact can read an owner's register: verified email, accepted contact, and the
-- owner's ladder must be 'released'. Balances are derived here so they match what the owner sees.
create function public.get_register_for_contact(p_owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
       select 1 from public.trusted_contacts c
       where c.user_id = p_owner and lower(c.email) = public.verified_email() and c.status = 'accepted')
     or not exists (select 1 from public.release_checkins r where r.user_id = p_owner and r.state = 'released')
  then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.audit_log (user_id, actor, event) values (p_owner, 'contact', 'register_viewed');

  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', i.kind, 'title', i.title, 'counterparty', i.counterparty, 'amount_laari', i.amount_laari,
        'details', (select s.decrypted_secret from vault.decrypted_secrets s
                     where s.id = i.details_secret_id and s.name = 'register:' || i.id || ':details')
      ) order by i.kind, i.title)
      from public.register_items i where i.user_id = p_owner), '[]'::jsonb),
    -- Debts the owner chose to include, with what is still owed. Settled debts are left out.
    'debts', coalesce((
      select jsonb_agg(jsonb_build_object('lender', b.lender, 'kind', b.kind, 'balance_laari', b.balance_laari) order by b.lender)
      from (select d.lender, d.kind,
                   greatest(d.opening_balance_laari - coalesce((select sum(p.amount_laari) from public.debt_payments p where p.debt_id = d.id), 0), 0) as balance_laari
            from public.debts d where d.user_id = p_owner and d.in_register) b
      where b.balance_laari > 0), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ------------------------------------------------------ server-side (service role) helpers

-- The release function records notices it sent ("step 2 email sent") without any table right.
create function public.log_release_event(p_user uuid, p_event text, p_meta jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('notice_sent', 'release_blocked') then
    raise exception 'unknown event' using errcode = '22023';
  end if;
  insert into public.audit_log (user_id, actor, event, meta) values (p_user, 'system', p_event, coalesce(p_meta, '{}'::jsonb));
end;
$$;

-- ------------------------------------------------------------------- grants

revoke all on function public.trusted_contacts_guard() from public, anon, authenticated;
revoke all on function public.trusted_contacts_audit() from public, anon, authenticated;
revoke all on function public.delete_register_secret() from public, anon, authenticated;
revoke all on function public.release_checkins_guard() from public, anon, authenticated;
revoke all on function public.release_checkins_audit() from public, anon, authenticated;
revoke all on function public.release_eligible(uuid) from public, anon, authenticated;
revoke all on function public.verified_email() from public, anon, authenticated;
revoke all on function public.save_register_item(uuid, text, text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.get_register_item_details(uuid) from public, anon, authenticated;
revoke all on function public.record_activity() from public, anon, authenticated;
revoke all on function public.set_away_mode(integer) from public, anon, authenticated;
revoke all on function public.contact_cases() from public, anon, authenticated;
revoke all on function public.answer_release_check(uuid, text) from public, anon, authenticated;
revoke all on function public.withdraw_release_answer(uuid) from public, anon, authenticated;
revoke all on function public.get_register_for_contact(uuid) from public, anon, authenticated;
revoke all on function public.log_release_event(uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.save_register_item(uuid, text, text, text, bigint, text) to authenticated;
grant execute on function public.get_register_item_details(uuid) to authenticated;
grant execute on function public.record_activity() to authenticated;
grant execute on function public.set_away_mode(integer) to authenticated;
grant execute on function public.contact_cases() to authenticated;
grant execute on function public.answer_release_check(uuid, text) to authenticated;
grant execute on function public.withdraw_release_answer(uuid) to authenticated;
grant execute on function public.get_register_for_contact(uuid) to authenticated;
-- Server only.
grant execute on function public.release_eligible(uuid) to service_role;
grant execute on function public.log_release_event(uuid, text, jsonb) to service_role;

revoke all on public.audit_log, public.trusted_contacts, public.invite_attempts, public.register_items,
  public.release_config, public.release_checkins, public.release_confirmations from anon, authenticated, service_role;

-- Owners: read their own ladder, answers and audit log; read and delete register items (writes go
-- through save_register_item); invite one contact and revoke one (the guard freezes the rest).
grant select on public.audit_log, public.release_checkins, public.release_confirmations to authenticated;
grant select, delete on public.register_items to authenticated;
grant select on public.trusted_contacts to authenticated;
grant insert (id, user_id, name, inviter_name, email, phone, invite_token_hash, invite_expires_at, consented_at)
  on public.trusted_contacts to authenticated;
grant update (status) on public.trusted_contacts to authenticated;

-- Service role (the release and invite edge functions). Each power is listed so review sees it:
--  * the ladder: read, and move the state (the guard decides whether the move is allowed);
--  * contacts and answers: read, to send emails and decide;
--  * the kill switch: read only (it is changed by hand);
--  * accept-invite: set a contact's status, and the attempt throttle.
grant select on public.release_checkins, public.release_confirmations, public.release_config to service_role;
grant update (state) on public.release_checkins to service_role;
grant select on public.trusted_contacts to service_role;
grant update (status) on public.trusted_contacts to service_role;
grant select, insert on public.invite_attempts to service_role;

-- --------------------------------------------------------------------- RLS

alter table public.audit_log             enable row level security;
alter table public.trusted_contacts      enable row level security;
alter table public.invite_attempts       enable row level security;
alter table public.register_items        enable row level security;
alter table public.release_config        enable row level security;
alter table public.release_checkins      enable row level security;
alter table public.release_confirmations enable row level security;

create policy audit_log_select_own on public.audit_log for select to authenticated using (user_id = (select auth.uid()));
create policy release_checkins_select_own on public.release_checkins for select to authenticated using (user_id = (select auth.uid()));
create policy release_confirmations_select_own on public.release_confirmations for select to authenticated using (user_id = (select auth.uid()));
create policy register_items_select_own on public.register_items for select to authenticated using (user_id = (select auth.uid()));
create policy register_items_delete_own on public.register_items for delete to authenticated using (user_id = (select auth.uid()));

create policy trusted_contacts_select_own on public.trusted_contacts for select to authenticated using (user_id = (select auth.uid()));
create policy trusted_contacts_insert_own on public.trusted_contacts for insert to authenticated with check (user_id = (select auth.uid()));
create policy trusted_contacts_update_own on public.trusted_contacts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No delete policy: a contact is revoked, never erased, so the audit trail stays meaningful.
-- There is deliberately NO policy that lets a trusted contact read anything. They use the functions above.

-- release_config and invite_attempts have RLS on and no client policy. The service role reads and
-- writes them through the grants above (it bypasses RLS).
