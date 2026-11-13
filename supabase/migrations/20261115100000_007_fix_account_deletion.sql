-- Migration 007: fix account deletion.
-- Deleting a user cascades to their register items, and the item-delete trigger then tried to write
-- an audit row for a user that no longer exists, so the whole deletion failed (foreign key).
-- Now the audit row is written only while the user still exists (a person deleting one item);
-- when the whole account goes, the audit log is removed with it by the cascade anyway.
-- The encrypted details in Vault are still deleted in both cases.

create or replace function public.delete_register_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.details_secret_id is not null then
    delete from vault.secrets where id = old.details_secret_id;
  end if;
  if exists (select 1 from auth.users u where u.id = old.user_id) then
    insert into public.audit_log (user_id, actor, event, meta)
    values (old.user_id, 'user', 'register_item_changed', jsonb_build_object('item_id', old.id, 'deleted', true));
  end if;
  return old;
end;
$$;

revoke all on function public.delete_register_secret() from public, anon, authenticated;
