-- Migration 002: hosted Supabase projects ship an event-trigger helper
-- public.rls_auto_enable() (trigger "ensure_rls") that turns RLS on for new
-- public tables. It must never be callable through the REST API.
-- Guarded so it is a no-op on local databases, where the function does not exist.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
