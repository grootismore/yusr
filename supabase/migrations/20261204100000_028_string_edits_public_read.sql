-- Migration 028: let the app read the wording edits made in the string editor.
--
-- Wording is not private (it is the text every screen shows, before sign-in too), so anyone may read it. Writing stays
-- with the string-edits edge function (service role, behind the editor key): no insert, update or delete is granted here.

grant select on public.string_edits to anon, authenticated;
create policy string_edits_read on public.string_edits for select to anon, authenticated using (true);
