-- Migration 030: shared income can be kept in its currency, like a person's own income.
--
-- A shared entry already stores its currency and rate. This adds the same "keep it in that currency" choice a person's own
-- income has, so USD received into the shared pot counts as held USD for the person who received it, and can be converted
-- to MVR from Home. Nothing about totals changes: MVR is still worked out from the rate when the entry is saved.

alter table public.household_entries add column keep_in_currency boolean not null default false;
