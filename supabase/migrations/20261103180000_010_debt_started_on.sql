-- Migration 010: an optional start date for a debt ("when did this debt begin?").
-- Nothing else changes. Debts use column-level grants for the app's signed-in users, so the new
-- column is granted explicitly; the row-level security that keeps each person to their own debts
-- is unchanged.

alter table public.debts add column started_on date;

grant insert (started_on) on public.debts to authenticated;
grant update (started_on) on public.debts to authenticated;
