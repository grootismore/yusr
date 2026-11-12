-- Migration 005: spell out what the server role (service_role) may touch.
--
-- On a hosted Supabase project, tables created by migrations give service_role no privileges at
-- all (it only has the access explicitly granted), while a local database hands it everything by
-- default. That difference hid a real bug: the invite function worked locally and got 403 on the
-- hosted project. This migration makes both behave the same, and keeps the server role to the
-- least it needs:
--   * the public invite endpoint:   read + insert on invite_attempts, read contacts, set their status
--   * everything else (debts, transactions, the audit log, release cases, ...) stays closed to it.
-- Future server functions (the release flow in v1.1) must ask for their own grants in their own
-- migration, so each new power is visible in review.

revoke all on all tables in schema public from service_role;
revoke all on all sequences in schema public from service_role;
-- Tables created from now on do not hand service_role anything by default.
alter default privileges for role postgres in schema public revoke all on tables from service_role;
alter default privileges for role postgres in schema public revoke all on sequences from service_role;

grant select, insert on public.invite_attempts to service_role;
grant select on public.trusted_contacts to service_role;
grant update (status) on public.trusted_contacts to service_role;
