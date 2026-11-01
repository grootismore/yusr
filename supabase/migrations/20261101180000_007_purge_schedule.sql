-- Migration 007: nightly purge of accounts whose 7-day deletion grace period has ended.
-- Separate from 006 so the data model can be applied without the scheduler.

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-due-account-deletions', '17 3 * * *', 'select public.purge_due_account_deletions()');
