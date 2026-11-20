-- Migration 026: IOUs, money lent or borrowed between two people.
--
-- One person makes the IOU (user_id) and says whether they lent or borrowed. The other person is a name, optionally with
-- an email. When someone signs in with that email they see the IOU as an invitation; accepting links their account
-- (person_account), and from then on both people see the same IOU and can record payments against it. Only the person
-- who made it can change or delete it. Amounts are whole laari in MVR. Nothing is ever sent from here: nudges are a
-- phone reminder for the maker, plus an email from the iou-nudges function when the maker chose "remind them too".

create table public.ious (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  -- From the maker's point of view.
  direction      text not null check (direction in ('lent', 'borrowed')),
  person_name    text not null check (char_length(person_name) between 1 and 80),
  person_email   text check (person_email is null or (person_email = lower(person_email) and person_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  person_account uuid references auth.users (id) on delete set null,
  title          text check (title is null or char_length(title) <= 120),
  amount_laari   bigint not null check (amount_laari > 0),
  lent_on        date not null default current_date,
  due_on         date,
  -- off: no reminders. me: reminders on the maker's phone. both: also an email to the other person (only when they lent).
  nudge          text not null default 'me' check (nudge in ('off', 'me', 'both')),
  created_at     timestamptz not null default now(),
  check (nudge <> 'both' or (direction = 'lent' and person_email is not null))
);
create index ious_user on public.ious (user_id);
create index ious_account on public.ious (person_account) where person_account is not null;
create index ious_email on public.ious (person_email) where person_email is not null and person_account is null;
alter table public.ious enable row level security;

create table public.iou_payments (
  id           uuid primary key default gen_random_uuid(),
  iou_id       uuid not null references public.ious (id) on delete cascade,
  amount_laari bigint not null check (amount_laari > 0),
  paid_on      date not null default current_date,
  note         text check (note is null or char_length(note) <= 120),
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index iou_payments_iou on public.iou_payments (iou_id);
alter table public.iou_payments enable row level security;

-- When each email nudge went out, so it is sent every few days and never in a flood. Only the function reads or writes it.
create table public.iou_nudges (
  id      uuid primary key default gen_random_uuid(),
  iou_id  uuid not null references public.ious (id) on delete cascade,
  sent_on date not null default current_date
);
create index iou_nudges_iou on public.iou_nudges (iou_id, sent_on desc);
alter table public.iou_nudges enable row level security;
revoke all on public.iou_nudges from anon, authenticated;
grant select, insert, delete on public.iou_nudges to service_role;
grant select on public.ious to service_role;

-- Either person in the IOU.
create function public.is_iou_party(p_iou uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ious i where i.id = p_iou and ((select auth.uid()) in (i.user_id, i.person_account)));
$$;
revoke all on function public.is_iou_party(uuid) from public, anon;
grant execute on function public.is_iou_party(uuid) to authenticated;

revoke all on public.ious, public.iou_payments from anon, authenticated;
grant select, insert, update, delete on public.ious to authenticated;
grant select, insert, delete on public.iou_payments to authenticated;
-- The other person can never be changed from the app; they link themselves by accepting.
revoke update on public.ious from authenticated;
grant update (direction, person_name, person_email, title, amount_laari, lent_on, due_on, nudge) on public.ious to authenticated;

create policy ious_party_read on public.ious for select to authenticated
  using ((select auth.uid()) in (user_id, person_account));
create policy ious_maker_insert on public.ious for insert to authenticated
  with check (user_id = (select auth.uid()) and person_account is null);
create policy ious_maker_update on public.ious for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ious_maker_delete on public.ious for delete to authenticated
  using (user_id = (select auth.uid()));

create policy iou_payments_party_read on public.iou_payments for select to authenticated using (public.is_iou_party(iou_id));
create policy iou_payments_party_insert on public.iou_payments for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_iou_party(iou_id));
create policy iou_payments_own_delete on public.iou_payments for delete to authenticated
  using (created_by = (select auth.uid()) and public.is_iou_party(iou_id));

-- IOUs made for the signed-in person's email that they have not accepted yet.
create function public.my_iou_invites()
returns table (iou_id uuid, made_by_name text, direction text, amount_laari bigint, title text, due_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, (select m.display_name from public.household_members m where m.user_id = i.user_id limit 1) as made_by_name,
         -- Turned round: what they lent is what you borrowed.
         case i.direction when 'lent' then 'borrowed' else 'lent' end, i.amount_laari, i.title, i.due_on
  from public.ious i
  where i.person_account is null and i.person_email = public.session_email() and i.user_id <> (select auth.uid());
$$;
revoke all on function public.my_iou_invites() from public, anon;
grant execute on function public.my_iou_invites() to authenticated;

-- Take an invitation: you become the other person in the IOU.
create function public.accept_iou(p_iou uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  update public.ious set person_account = uid
   where id = p_iou and person_account is null and person_email = public.session_email() and user_id <> uid;
  if not found then raise exception 'invalid invitation' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.accept_iou(uuid) from public, anon;
grant execute on function public.accept_iou(uuid) to authenticated;

-- Turn an invitation down: the maker keeps their record, without your email on it.
create function public.decline_iou(p_iou uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ious set person_email = null, nudge = case when nudge = 'both' then 'me' else nudge end
   where id = p_iou and person_account is null and person_email = public.session_email();
$$;
revoke all on function public.decline_iou(uuid) from public, anon;
grant execute on function public.decline_iou(uuid) to authenticated;

-- The person on the other side leaves an IOU they accepted. It stays on the maker's side.
create function public.leave_iou(p_iou uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ious set person_account = null, person_email = null, nudge = case when nudge = 'both' then 'me' else nudge end
   where id = p_iou and person_account = (select auth.uid());
$$;
revoke all on function public.leave_iou(uuid) from public, anon;
grant execute on function public.leave_iou(uuid) to authenticated;
