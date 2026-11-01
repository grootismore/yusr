-- Migration 007: erase accounts whose 7-day deletion grace period has ended, nightly.
-- Separate from 006 so the data model can be applied without the scheduler.

-- Runs from pg_cron only (never callable by a client).
create function public.purge_due_account_deletions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  with due as (
    delete from auth.users
    where id in (select user_id from public.deletion_requests where scheduled_for <= now())
    returning 1
  )
  select count(*) into removed from due;
  return removed;
end;
$$;

revoke all on function public.purge_due_account_deletions() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-due-account-deletions', '17 3 * * *', 'select public.purge_due_account_deletions()');
