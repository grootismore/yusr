-- Migration 021: Kharadhu Plus.
--
-- A person is on Plus when they have an entitlements row with plan = 'plus' that has not expired. Only the server writes
-- it (the store webhook, or by hand for a promo); the app can only read its own row. The free limits are enforced here,
-- not only in the app: a seventh active recurring item, a third Split group, or a third person in a household needs Plus
-- (for a household, its owner's Plus). Existing rows over a limit stay; only new ones are refused, with the message
-- 'plus_required:<what>'. Scans: 10 a month free, 100 on Plus; the scan function asks scan_limit().

create table public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free', 'plus')),
  source     text check (source in ('appstore', 'playstore', 'promo', 'manual')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy entitlements_own_read on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.entitlements from anon, authenticated, service_role;
grant select on public.entitlements to authenticated;

create function public.is_plus(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = p_user and e.plan = 'plus' and (e.expires_at is null or e.expires_at > now())
  );
$$;

create function public.scan_limit(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_plus(p_user) then 100 else 10 end;
$$;

revoke all on function public.is_plus(uuid) from public, anon, authenticated;
revoke all on function public.scan_limit(uuid) from public, anon, authenticated;
grant execute on function public.is_plus(uuid) to service_role;
grant execute on function public.scan_limit(uuid) to service_role;

-- ------------------------------------------------------------------ the free limits
create function public.plus_limit_recurring()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.recurring_items r where r.user_id = new.user_id and r.ended_on is null) >= 6
     and not public.is_plus(new.user_id) then
    raise exception 'plus_required:recurring';
  end if;
  return new;
end;
$$;

create function public.plus_limit_split()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.split_groups g where g.user_id = new.user_id and not g.archived) >= 2
     and not public.is_plus(new.user_id) then
    raise exception 'plus_required:split';
  end if;
  return new;
end;
$$;

create function public.plus_limit_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.household_members m where m.household_id = new.household_id) >= 2
     and not public.is_plus((select h.created_by from public.households h where h.id = new.household_id)) then
    raise exception 'plus_required:household';
  end if;
  return new;
end;
$$;

revoke all on function public.plus_limit_recurring() from public, anon, authenticated;
revoke all on function public.plus_limit_split() from public, anon, authenticated;
revoke all on function public.plus_limit_household() from public, anon, authenticated;

create trigger recurring_items_plus_limit before insert on public.recurring_items
  for each row execute function public.plus_limit_recurring();
create trigger split_groups_plus_limit before insert on public.split_groups
  for each row execute function public.plus_limit_split();
create trigger household_members_plus_limit before insert on public.household_members
  for each row execute function public.plus_limit_household();
