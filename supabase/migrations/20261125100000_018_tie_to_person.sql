-- Migration 018: shared items can be tied to a person in the household.
--
-- A shared debt, money pool or monthly gift gets `for_user`: whose it is (null = everyone's). A shared entry already says
-- who paid or received it in `user_id`; anyone in the household may now record it for another member ("Nanns paid this
-- bill", "Areesh's salary"). The person must be a member of the household, and is cleared when they leave.

alter table public.debts              add column for_user uuid references auth.users (id) on delete set null;
alter table public.money_pools        add column for_user uuid references auth.users (id) on delete set null;
alter table public.giving_commitments add column for_user uuid references auth.users (id) on delete set null;

create function public.household_for_user_ok()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.for_user is not null and not exists (
    select 1 from public.household_members m where m.household_id = new.household_id and m.user_id = new.for_user
  ) then
    raise exception 'that person is not in the household' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.household_for_user_ok() from public, anon, authenticated;

create trigger debts_for_user before insert or update of for_user, household_id on public.debts
  for each row execute function public.household_for_user_ok();
create trigger money_pools_for_user before insert or update of for_user, household_id on public.money_pools
  for each row execute function public.household_for_user_ok();
create trigger giving_commitments_for_user before insert or update of for_user, household_id on public.giving_commitments
  for each row execute function public.household_for_user_ok();

-- When someone leaves or is removed, what was tied to them becomes everyone's.
create function public.household_untie_leaver()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.debts set for_user = null where household_id = old.household_id and for_user = old.user_id;
  update public.money_pools set for_user = null where household_id = old.household_id and for_user = old.user_id;
  update public.giving_commitments set for_user = null where household_id = old.household_id and for_user = old.user_id;
  return old;
end;
$$;
revoke all on function public.household_untie_leaver() from public, anon, authenticated;
create trigger household_members_untie after delete on public.household_members
  for each row execute function public.household_untie_leaver();

-- Shared entries: record one for any member of the household, not only yourself.
drop policy household_entries_member_insert on public.household_entries;
create policy household_entries_member_insert on public.household_entries for insert to authenticated
  with check (public.is_household_member(household_id)
              and exists (select 1 from public.household_members m where m.household_id = household_entries.household_id and m.user_id = household_entries.user_id)
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));
