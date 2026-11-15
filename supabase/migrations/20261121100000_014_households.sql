-- Migration 014: households (a shared account for a couple or a family).
--
-- Private stays private: a person's own expenses, income, budgets, debts and everything else keep the owner-only rules
-- they already have, and nothing here touches them. A household adds ONE shared pot, household_entries: expenses and
-- income that any member of the household can see, add, change and delete. A person chooses, entry by entry, whether it
-- goes in the shared pot or stays their own.
--
-- Membership is added only through the functions below (security definer): create_household, create_household_invite and
-- join_household. A member can leave (delete their own row), and the owner can remove someone (delete theirs): row
-- security allows exactly those two deletes and nothing else on the members table.
-- A person is in at most one household. A join code is single-use, expires after seven days, and is stored only as a
-- hash; failed attempts are limited per person.

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  role          text not null default 'member' check (role in ('owner', 'member')),
  joined_at     timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- One household per person.
create unique index household_members_one_per_user on public.household_members (user_id);

create table public.household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  code_hash     text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_by    uuid references auth.users (id) on delete set null,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  used_by       uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.household_join_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  at         timestamptz not null default now()
);
create index household_join_attempts_user_idx on public.household_join_attempts (user_id, at desc);

-- The shared pot.
create table public.household_entries (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  -- Who paid it (an expense) or received it (income). Always a member.
  user_id         uuid not null references auth.users (id) on delete cascade,
  kind            text not null check (kind in ('expense', 'income')),
  amount_laari    bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  currency        text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_mvr  numeric(18, 8) not null default 1 check (fx_rate_to_mvr > 0),
  mvr_laari       bigint generated always as (round(amount_laari * fx_rate_to_mvr)::bigint) stored,
  category_id     uuid references public.categories (id) on delete set null,
  merchant        text check (char_length(merchant) <= 200),
  note            text check (char_length(note) <= 500),
  entry_date      date not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (currency <> 'MVR' or fx_rate_to_mvr = 1),
  check (kind = 'expense' or category_id is null)
);
create index household_entries_household_date_idx on public.household_entries (household_id, entry_date desc);
create trigger household_entries_updated_at before update on public.household_entries
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ helpers

-- Is the signed-in person in this household? Security definer so the table policies can ask it without looping.
create function public.is_household_member(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.household_members m where m.household_id = p_household and m.user_id = (select auth.uid()));
$$;

-- Remove a household once its last member has gone.
create function public.household_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.household_members m where m.household_id = old.household_id) then
    delete from public.households where id = old.household_id;
  end if;
  return old;
end;
$$;
create trigger household_members_cleanup after delete on public.household_members
  for each row execute function public.household_cleanup();

-- ------------------------------------------------------------------ membership functions

create function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.household_members m where m.user_id = uid) then
    raise exception 'already in a household' using errcode = '23505';
  end if;
  insert into public.households (name, created_by) values (p_name, uid) returning id into hid;
  insert into public.household_members (household_id, user_id, display_name, role) values (hid, uid, p_display_name, 'owner');
  return hid;
end;
$$;

-- A one-time code the owner shares in person or by message. Returned once; only its hash is kept.
create function public.create_household_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
  code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
begin
  select m.household_id into hid from public.household_members m where m.user_id = uid;
  if hid is null then raise exception 'not in a household' using errcode = '42501'; end if;
  if (select count(*) from public.household_members m where m.household_id = hid) >= 6 then
    raise exception 'household is full' using errcode = '53400';
  end if;
  insert into public.household_invites (household_id, code_hash, created_by, expires_at)
  values (hid, encode(sha256(convert_to(code, 'UTF8')), 'hex'), uid, now() + interval '7 days');
  return code;
end;
$$;

create function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inv public.household_invites;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if (select count(*) from public.household_join_attempts a where a.user_id = uid and a.at > now() - interval '1 hour') >= 10 then
    raise exception 'too many attempts' using errcode = '54000';
  end if;
  insert into public.household_join_attempts (user_id) values (uid);
  if exists (select 1 from public.household_members m where m.user_id = uid) then
    raise exception 'already in a household' using errcode = '23505';
  end if;
  select * into inv from public.household_invites i
   where i.code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex')
     and i.used_at is null and i.expires_at > now()
   for update;
  if not found then raise exception 'invalid or expired code' using errcode = 'P0002'; end if;
  if (select count(*) from public.household_members m where m.household_id = inv.household_id) >= 6 then
    raise exception 'household is full' using errcode = '53400';
  end if;
  insert into public.household_members (household_id, user_id, display_name) values (inv.household_id, uid, p_display_name);
  update public.household_invites set used_at = now(), used_by = uid where id = inv.id;
  return inv.household_id;
end;
$$;

-- Is the signed-in person the owner of this household? Used by the policy that lets an owner remove someone.
create function public.is_household_owner(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.household_members m where m.household_id = p_household and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;

-- When the owner leaves and others remain, the longest-standing member becomes the owner.
create function public.household_promote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and exists (select 1 from public.household_members m where m.household_id = old.household_id) then
    update public.household_members set role = 'owner'
     where household_id = old.household_id
       and user_id = (select m.user_id from public.household_members m where m.household_id = old.household_id order by m.joined_at limit 1);
  end if;
  return old;
end;
$$;
create trigger household_members_promote after delete on public.household_members
  for each row execute function public.household_promote();

-- ------------------------------------------------------------------ row security

alter table public.households              enable row level security;
alter table public.household_members       enable row level security;
alter table public.household_invites       enable row level security;
alter table public.household_join_attempts enable row level security;
alter table public.household_entries       enable row level security;

create policy households_member_read on public.households for select to authenticated
  using (public.is_household_member(id));
create policy household_members_member_read on public.household_members for select to authenticated
  using (public.is_household_member(household_id));
-- A member can change only their own display name (column grant below); everything else goes through the functions.
create policy household_members_self_update on public.household_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Leave: delete your own row. Remove: the owner deletes someone else's. (Cleanup and promotion are triggers.)
create policy household_members_leave_or_remove on public.household_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_household_owner(household_id));
-- Invites and attempts have no client policy at all: only the functions touch them.

create policy household_entries_member_read on public.household_entries for select to authenticated
  using (public.is_household_member(household_id));
create policy household_entries_member_insert on public.household_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_household_member(household_id)
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));
create policy household_entries_member_update on public.household_entries for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id)
              and exists (select 1 from public.household_members m where m.household_id = household_entries.household_id and m.user_id = household_entries.user_id)
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));
create policy household_entries_member_delete on public.household_entries for delete to authenticated
  using (public.is_household_member(household_id));

revoke all on public.households, public.household_members, public.household_invites, public.household_join_attempts, public.household_entries
  from anon, authenticated, service_role;
grant select on public.households, public.household_members to authenticated;
grant update (display_name) on public.household_members to authenticated;
grant delete on public.household_members to authenticated;
grant select, insert, update, delete on public.household_entries to authenticated;

revoke all on function public.is_household_member(uuid) from public, anon, authenticated;
revoke all on function public.household_cleanup() from public, anon, authenticated;
revoke all on function public.create_household(text, text) from public, anon, authenticated;
revoke all on function public.create_household_invite() from public, anon, authenticated;
revoke all on function public.join_household(text, text) from public, anon, authenticated;
revoke all on function public.is_household_owner(uuid) from public, anon, authenticated;
revoke all on function public.household_promote() from public, anon, authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
