-- Migration 023: Split groups shared with friends who have the app.
--
-- A group's people are still plain names; a person can now be linked to a signed-in account (account_id). Anyone linked
-- is a member of the group: they see it live and can add and change costs, payments and people. Only the owner can
-- rename, archive or delete the group, and take someone out. Friends are added by email: the owner types a name and an
-- email, which makes the person and an invitation. Nothing is sent and nobody learns whether an account exists: when
-- someone signs in with that email, the invitation shows in their Split screen, and accepting links them to that name.
-- A member can only ever link themselves; no one can be put in a group by someone else.

alter table public.split_people add column account_id uuid references auth.users (id) on delete set null;
-- The owner is a member of their own groups.
update public.split_people set account_id = user_id where is_me;
create unique index split_people_one_account on public.split_people (group_id, account_id) where account_id is not null;

create function public.is_split_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.split_people p where p.group_id = p_group and p.account_id = (select auth.uid()))
      or exists (select 1 from public.split_groups g where g.id = p_group and g.user_id = (select auth.uid()));
$$;
revoke all on function public.is_split_member(uuid) from public, anon;
grant execute on function public.is_split_member(uuid) to authenticated;

-- A person row can be linked only by the functions below, or to yourself when you make your own row.
revoke update on public.split_people from authenticated;
grant update (name) on public.split_people to authenticated;

-- Whatever the row policies say, a person can only be created already linked to yourself.
create function public.split_people_link_self()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_id is not null and (select auth.uid()) is not null and new.account_id <> (select auth.uid()) then
    raise exception 'a person can only be linked to yourself' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.split_people_link_self() from public, anon, authenticated;
create trigger split_people_link_self before insert on public.split_people for each row execute function public.split_people_link_self();

-- ------------------------------------------------------------------ members see and change the group's rows
create policy split_groups_member_read on public.split_groups for select to authenticated
  using (public.is_split_member(id));

create policy split_people_member_read on public.split_people for select to authenticated
  using (public.is_split_member(group_id));
create policy split_people_member_insert on public.split_people for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_split_member(group_id) and (account_id is null or account_id = (select auth.uid())));
create policy split_people_member_update on public.split_people for update to authenticated
  using (public.is_split_member(group_id)) with check (public.is_split_member(group_id));

create policy split_expenses_member_read on public.split_expenses for select to authenticated using (public.is_split_member(group_id));
create policy split_expenses_member_insert on public.split_expenses for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_split_member(group_id));
create policy split_expenses_member_update on public.split_expenses for update to authenticated
  using (public.is_split_member(group_id)) with check (public.is_split_member(group_id));
create policy split_expenses_member_delete on public.split_expenses for delete to authenticated using (public.is_split_member(group_id));

create policy split_shares_member_read on public.split_shares for select to authenticated using (public.is_split_member(group_id));
create policy split_shares_member_insert on public.split_shares for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_split_member(group_id));
create policy split_shares_member_update on public.split_shares for update to authenticated
  using (public.is_split_member(group_id)) with check (public.is_split_member(group_id));
create policy split_shares_member_delete on public.split_shares for delete to authenticated using (public.is_split_member(group_id));

create policy split_settlements_member_read on public.split_settlements for select to authenticated using (public.is_split_member(group_id));
create policy split_settlements_member_insert on public.split_settlements for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_split_member(group_id));
create policy split_settlements_member_update on public.split_settlements for update to authenticated
  using (public.is_split_member(group_id)) with check (public.is_split_member(group_id));
create policy split_settlements_member_delete on public.split_settlements for delete to authenticated using (public.is_split_member(group_id));

-- ------------------------------------------------------------------ invitations
create table public.split_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.split_groups (id) on delete cascade,
  person_id   uuid not null,
  email       text not null check (email = lower(email) and email like '%_@_%' and char_length(email) <= 254),
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (person_id),
  foreign key (person_id, group_id) references public.split_people (id, group_id) on delete cascade
);
create index split_invites_email_idx on public.split_invites (email);
alter table public.split_invites enable row level security;
create policy split_invites_member_read on public.split_invites for select to authenticated using (public.is_split_member(group_id));
create policy split_invites_member_insert on public.split_invites for insert to authenticated
  with check (invited_by = (select auth.uid()) and public.is_split_member(group_id));
create policy split_invites_member_delete on public.split_invites for delete to authenticated using (public.is_split_member(group_id));
revoke all on public.split_invites from anon, authenticated, service_role;
grant select, insert, delete on public.split_invites to authenticated;

-- The email on the signed-in session (the app only gets a session once the email is confirmed).
create function public.session_email()
returns text
language sql
stable
set search_path = ''
as $$ select lower(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', '')); $$;
revoke all on function public.session_email() from public, anon;
grant execute on function public.session_email() to authenticated;

-- Invitations for the signed-in person's email: what group, who asked, and the name they were given.
create function public.my_split_invites()
returns table (invite_id uuid, group_name text, invited_by_name text, person_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, g.name,
         (select p.name from public.split_people p where p.group_id = i.group_id and p.account_id = i.invited_by),
         pp.name
  from public.split_invites i
  join public.split_groups g on g.id = i.group_id
  join public.split_people pp on pp.id = i.person_id
  where i.email = public.session_email() and pp.account_id is null;
$$;

-- Take an invitation: you become that person in the group.
create function public.accept_split_invite(p_invite uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inv public.split_invites;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into inv from public.split_invites i where i.id = p_invite and i.email = public.session_email() for update;
  if not found then raise exception 'invalid invitation' using errcode = 'P0002'; end if;
  if exists (select 1 from public.split_people p where p.group_id = inv.group_id and p.account_id = uid) then
    delete from public.split_invites where id = inv.id;
    return inv.group_id;
  end if;
  update public.split_people set account_id = uid where id = inv.person_id and account_id is null;
  if not found then raise exception 'invalid invitation' using errcode = 'P0002'; end if;
  delete from public.split_invites where id = inv.id;
  return inv.group_id;
end;
$$;

create function public.decline_split_invite(p_invite uuid)
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.split_invites where id = p_invite and email = public.session_email(); $$;

-- A member leaves a group (their name and history stay); the owner cannot, they delete the group instead.
create function public.leave_split_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if exists (select 1 from public.split_groups g where g.id = p_group and g.user_id = uid) then
    raise exception 'the owner cannot leave' using errcode = '42501';
  end if;
  update public.split_people set account_id = null where group_id = p_group and account_id = uid;
end;
$$;

-- The owner takes someone's access away (their name and history stay).
create function public.unlink_split_person(p_person uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  update public.split_people p set account_id = null
   where p.id = p_person and p.is_me = false and exists (select 1 from public.split_groups g where g.id = p.group_id and g.user_id = uid);
end;
$$;

revoke all on function public.my_split_invites() from public, anon;
revoke all on function public.accept_split_invite(uuid) from public, anon;
revoke all on function public.decline_split_invite(uuid) from public, anon;
revoke all on function public.leave_split_group(uuid) from public, anon;
revoke all on function public.unlink_split_person(uuid) from public, anon;
grant execute on function public.my_split_invites() to authenticated;
grant execute on function public.accept_split_invite(uuid) to authenticated;
grant execute on function public.decline_split_invite(uuid) to authenticated;
grant execute on function public.leave_split_group(uuid) to authenticated;
grant execute on function public.unlink_split_person(uuid) to authenticated;
