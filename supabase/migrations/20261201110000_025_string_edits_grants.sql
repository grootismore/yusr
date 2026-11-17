-- Migration 025: Let the string-edits edge function (service role) use the table from migration 024.
-- The table has RLS on and no policies, so this grant is the only access: nothing for anon or signed-in users.

grant select, insert, update, delete on public.string_edits to service_role;
