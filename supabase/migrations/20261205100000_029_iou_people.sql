-- Migration 029: the people a person keeps IOUs with.
--
-- A private address book: a name and, optionally, an email. It is filled in when an IOU is saved and used to pick the
-- person again next time. Removing someone only removes them from this list; the IOUs already made keep their own copy
-- of the name and email. Only the owner can see or change their own list.

create table public.iou_people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  email      text check (email is null or (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  created_at timestamptz not null default now()
);
create unique index iou_people_name on public.iou_people (user_id, lower(name));
alter table public.iou_people enable row level security;

revoke all on public.iou_people from anon, authenticated;
grant select, insert, delete on public.iou_people to authenticated;
grant update (name, email) on public.iou_people to authenticated;

create policy iou_people_own_read on public.iou_people for select to authenticated using (user_id = (select auth.uid()));
create policy iou_people_own_insert on public.iou_people for insert to authenticated with check (user_id = (select auth.uid()));
create policy iou_people_own_update on public.iou_people for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy iou_people_own_delete on public.iou_people for delete to authenticated using (user_id = (select auth.uid()));
