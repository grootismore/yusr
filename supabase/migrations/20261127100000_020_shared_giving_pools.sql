-- Migration 020: paying a shared gift or pool contribution records it in the shared pot.
--
-- Until now, marking a shared commitment or pool paid wrote a private expense, so the household never saw the money
-- leave. Now a payment can point at a shared entry (household_entries) instead of the payer's own expense. Exactly one
-- of the two is set. Deleting the shared entry removes the payment marker with it, as deleting the expense did.

alter table public.sadaqah_entries alter column expense_id drop not null;
alter table public.sadaqah_entries add column household_entry_id uuid unique references public.household_entries (id) on delete cascade;
alter table public.sadaqah_entries add constraint sadaqah_one_source check (num_nonnulls(expense_id, household_entry_id) = 1);

alter table public.pool_payments alter column expense_id drop not null;
alter table public.pool_payments add column household_entry_id uuid unique references public.household_entries (id) on delete cascade;
alter table public.pool_payments add constraint pool_payment_one_source check (num_nonnulls(expense_id, household_entry_id) = 1);

-- You can record a payment against a shared entry you can see; the household can see the payment when it can see the entry.
create policy sadaqah_entries_household_insert on public.sadaqah_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and household_entry_id is not null
              and exists (select 1 from public.household_entries h where h.id = household_entry_id));
create policy sadaqah_entries_household_read on public.sadaqah_entries for select to authenticated
  using (household_entry_id is not null and exists (select 1 from public.household_entries h where h.id = household_entry_id));

create policy pool_payments_household_insert on public.pool_payments for insert to authenticated
  with check (user_id = (select auth.uid()) and household_entry_id is not null
              and exists (select 1 from public.household_entries h where h.id = household_entry_id)
              and exists (select 1 from public.money_pools p where p.id = pool_id));
create policy pool_payments_household_read on public.pool_payments for select to authenticated
  using (household_entry_id is not null and exists (select 1 from public.household_entries h where h.id = household_entry_id));
