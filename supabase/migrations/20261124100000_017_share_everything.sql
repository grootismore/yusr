-- Migration 017: debts, money pools and monthly giving can be shared with the household.
--
-- A row with household_id set is visible to, and editable by, everyone in that household. Without it, nothing changes:
-- it is private to its owner, as before. The owner (user_id) never changes. A payment records who made it (user_id).
-- Each person's own expenses stay private: a pool contribution or a gift is still an ordinary expense of whoever paid,
-- and the household only sees that the month is paid.

alter table public.debts            add column household_id uuid references public.households (id) on delete set null;
alter table public.money_pools      add column household_id uuid references public.households (id) on delete set null;
alter table public.giving_commitments add column household_id uuid references public.households (id) on delete set null;

create index debts_household_idx on public.debts (household_id) where household_id is not null;
create index money_pools_household_idx on public.money_pools (household_id) where household_id is not null;
create index giving_commitments_household_idx on public.giving_commitments (household_id) where household_id is not null;

-- The owner of a shared row cannot be changed by anyone.
create function public.keep_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'the owner cannot change' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_owner() from public, anon, authenticated;

create trigger debts_keep_owner before update on public.debts for each row execute function public.keep_owner();
create trigger money_pools_keep_owner before update on public.money_pools for each row execute function public.keep_owner();
create trigger giving_commitments_keep_owner before update on public.giving_commitments for each row execute function public.keep_owner();

-- ------------------------------------------------------------------ the three parents
-- Anyone in the household sees and changes a shared row; you create only rows you own, and only for a household you are in.

create policy debts_select on public.debts for select to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
create policy debts_insert on public.debts for insert to authenticated
  with check (user_id = (select auth.uid()) and (household_id is null or public.is_household_member(household_id)));
create policy debts_update on public.debts for update to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)))
  with check (household_id is null or public.is_household_member(household_id));
create policy debts_delete on public.debts for delete to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
drop policy debts_owner on public.debts;

create policy money_pools_select on public.money_pools for select to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
create policy money_pools_insert on public.money_pools for insert to authenticated
  with check (user_id = (select auth.uid()) and (household_id is null or public.is_household_member(household_id)));
create policy money_pools_update on public.money_pools for update to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)))
  with check (household_id is null or public.is_household_member(household_id));
create policy money_pools_delete on public.money_pools for delete to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
drop policy money_pools_owner on public.money_pools;

create policy giving_commitments_select on public.giving_commitments for select to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
create policy giving_commitments_insert on public.giving_commitments for insert to authenticated
  with check (user_id = (select auth.uid()) and (household_id is null or public.is_household_member(household_id)));
create policy giving_commitments_update on public.giving_commitments for update to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)))
  with check (household_id is null or public.is_household_member(household_id));
create policy giving_commitments_delete on public.giving_commitments for delete to authenticated
  using (user_id = (select auth.uid()) or (household_id is not null and public.is_household_member(household_id)));
drop policy giving_commitments_owner on public.giving_commitments;

-- ------------------------------------------------------------------ payments
-- A debt payment records who made it. It can point at any debt the person can see (their own, or a shared one).
alter table public.debt_payments drop constraint debt_payments_debt_id_user_id_fkey;
alter table public.debt_payments add constraint debt_payments_debt_fkey foreign key (debt_id) references public.debts (id) on delete cascade;

create policy debt_payments_select on public.debt_payments for select to authenticated
  using (exists (select 1 from public.debts d where d.id = debt_id));
create policy debt_payments_insert on public.debt_payments for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.debts d where d.id = debt_id));
create policy debt_payments_update on public.debt_payments for update to authenticated
  using (exists (select 1 from public.debts d where d.id = debt_id))
  with check (exists (select 1 from public.debts d where d.id = debt_id));
create policy debt_payments_delete on public.debt_payments for delete to authenticated
  using (exists (select 1 from public.debts d where d.id = debt_id));
drop policy debt_payments_owner on public.debt_payments;

-- A pool contribution is the payer's own expense plus this row; the household sees the row, not the expense.
create policy pool_payments_select on public.pool_payments for select to authenticated
  using (exists (select 1 from public.money_pools p where p.id = pool_id));
create policy pool_payments_insert on public.pool_payments for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.money_pools p where p.id = pool_id)
              and exists (select 1 from public.expenses e where e.id = expense_id));
create policy pool_payments_update on public.pool_payments for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy pool_payments_delete on public.pool_payments for delete to authenticated
  using (user_id = (select auth.uid()));
drop policy pool_payments_owner on public.pool_payments;

-- A gift paid against a shared commitment: the household can see which month it was for (not the amount or the expense).
create policy sadaqah_entries_shared_read on public.sadaqah_entries for select to authenticated
  using (commitment_id is not null and exists (select 1 from public.giving_commitments c where c.id = commitment_id));
