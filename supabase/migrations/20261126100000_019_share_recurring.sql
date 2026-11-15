-- Migration 019: recurring items can be shared with the household and tied to a person.
--
-- A shared item records its dates into the shared pot (household_entries) instead of the person's own expenses and
-- income, so everyone in the household sees them. `for_user` says whose it is (the person who pays the rent, whose
-- salary it is); null means anyone, and the entry is recorded under whoever's phone adds it. Each date is still recorded
-- once: the run row is unique per item and date, so two phones adding the same date cannot both succeed.

alter table public.recurring_items add column household_id uuid references public.households (id) on delete set null;
alter table public.recurring_items add column for_user uuid references auth.users (id) on delete set null;
create index recurring_items_household_idx on public.recurring_items (household_id) where household_id is not null;

create trigger recurring_items_keep_owner before update on public.recurring_items for each row execute function public.keep_owner();
create trigger recurring_items_for_user before insert or update of for_user, household_id on public.recurring_items
  for each row execute function public.household_for_user_ok();

-- A leaver's recurring items become everyone's, like the other shared things.
create or replace function public.household_untie_leaver()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.debts set for_user = null where household_id = old.household_id and for_user = old.user_id;
  update public.money_pools set for_user = null where household_id = old.household_id and for_user = old.user_id;
  update public.giving_commitments set for_user = null where household_id = old.household_id and for_user = old.user_id;
  update public.recurring_items set for_user = null where household_id = old.household_id and for_user = old.user_id;
  return old;
end;
$$;

create policy recurring_items_select on public.recurring_items for select to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
create policy recurring_items_insert on public.recurring_items for insert to authenticated
  with check (user_id = (select auth.uid()) and (household_id is null or public.is_household_member(household_id))
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));
create policy recurring_items_update on public.recurring_items for update to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)))
  with check ((household_id is null or public.is_household_member(household_id))
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));
create policy recurring_items_delete on public.recurring_items for delete to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
drop policy recurring_items_owner on public.recurring_items;

-- ------------------------------------------------------------------ runs
-- A date of a shared item points at the shared entry that was recorded for it. Deleting that entry keeps the date done.
alter table public.recurring_runs add column household_entry_id uuid references public.household_entries (id) on delete set null;
alter table public.recurring_runs add constraint recurring_runs_one_target check (num_nonnulls(expense_id, income_id, household_entry_id) <= 1);
alter table public.recurring_runs add constraint recurring_runs_skipped_no_entry check (not skipped or household_entry_id is null);

create policy recurring_runs_select on public.recurring_runs for select to authenticated
  using (exists (select 1 from public.recurring_items i where i.id = recurring_id));
create policy recurring_runs_insert on public.recurring_runs for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.recurring_items i where i.id = recurring_id)
              and (expense_id is null or exists (select 1 from public.expenses e where e.id = expense_id))
              and (income_id is null or exists (select 1 from public.income i where i.id = income_id))
              and (household_entry_id is null or exists (select 1 from public.household_entries h where h.id = household_entry_id)));
create policy recurring_runs_update on public.recurring_runs for update to authenticated
  using (exists (select 1 from public.recurring_items i where i.id = recurring_id))
  with check (exists (select 1 from public.recurring_items i where i.id = recurring_id));
create policy recurring_runs_delete on public.recurring_runs for delete to authenticated
  using (exists (select 1 from public.recurring_items i where i.id = recurring_id));
drop policy recurring_runs_owner on public.recurring_runs;
