-- Migration 016: a household is either a couple (two people) or a household (any number).
--
-- The owner sets the mode. A couple holds at most two members, enforced here and not only in the app: a third person
-- cannot be added to a couple, and a household with three or more members cannot be turned into a couple.

alter table public.households
  add column mode text not null default 'household' check (mode in ('couple', 'household'));

create function public.household_mode_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'household_members' then
    if (select h.mode from public.households h where h.id = new.household_id) = 'couple'
       and (select count(*) from public.household_members m where m.household_id = new.household_id) >= 2 then
      raise exception 'a couple has two people' using errcode = '23514';
    end if;
  elsif new.mode = 'couple' and (select count(*) from public.household_members m where m.household_id = new.id) > 2 then
    raise exception 'a couple has two people' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger household_members_mode_limit before insert on public.household_members
  for each row execute function public.household_mode_limit();
create trigger households_mode_limit before update of mode on public.households
  for each row execute function public.household_mode_limit();

-- Only the owner changes the mode (and nothing else on the household).
create policy households_owner_update on public.households for update to authenticated
  using (public.is_household_owner(id)) with check (public.is_household_owner(id));
grant update (mode) on public.households to authenticated;

revoke all on function public.household_mode_limit() from public, anon, authenticated;
