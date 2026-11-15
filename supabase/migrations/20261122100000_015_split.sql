-- Migration 015: Split, a Splitwise-style module for sharing costs with friends.
--
-- Version 1 is one person keeping the books for a group (a trip, a flat, a dinner club): the group, its people (by
-- name; they do not need the app), who paid for what, how it was split, and who has paid whom back. Everything is
-- owned by the person who created the group, with the same owner-only rules as the rest of the app. Balances are
-- worked out by the app from these rows, never stored, so they can never disagree with them.
--
-- Money is integer minor units of the group's currency. Composite foreign keys keep a group's rows inside that group:
-- an expense is paid by a person in the same group, a share belongs to a person and an expense of the same group.

create table public.split_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  currency    text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index split_groups_user_idx on public.split_groups (user_id, created_at desc);

create table public.split_people (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  group_id    uuid not null references public.split_groups (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  -- Exactly one person per group is the owner themselves.
  is_me       boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (id, group_id)
);
create unique index split_people_one_me on public.split_people (group_id) where is_me;
create index split_people_group_idx on public.split_people (group_id);

create table public.split_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  group_id      uuid not null references public.split_groups (id) on delete cascade,
  description   text not null check (char_length(description) between 1 and 100),
  amount_minor  bigint not null check (amount_minor > 0 and amount_minor <= 9007199254740991),
  paid_by       uuid not null,
  -- How it was divided, kept so it can be shown and edited the same way: equally, by exact amounts, by percent, or by shares.
  split_type    text not null default 'equal' check (split_type in ('equal', 'exact', 'percent', 'shares')),
  spent_on      date not null,
  note          text check (char_length(note) <= 300),
  created_at    timestamptz not null default now(),
  unique (id, group_id),
  foreign key (paid_by, group_id) references public.split_people (id, group_id) on delete restrict
);
create index split_expenses_group_date_idx on public.split_expenses (group_id, spent_on desc);

-- What each person owes for an expense, in minor units. The rows for one expense add up to its amount (the app makes sure).
create table public.split_shares (
  expense_id    uuid not null,
  person_id     uuid not null,
  group_id      uuid not null,
  user_id       uuid not null references auth.users (id) on delete cascade,
  share_minor   bigint not null check (share_minor >= 0 and share_minor <= 9007199254740991),
  primary key (expense_id, person_id),
  foreign key (expense_id, group_id) references public.split_expenses (id, group_id) on delete cascade,
  foreign key (person_id, group_id) references public.split_people (id, group_id) on delete cascade
);

-- Someone paying someone else back.
create table public.split_settlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  group_id      uuid not null references public.split_groups (id) on delete cascade,
  from_person   uuid not null,
  to_person     uuid not null,
  amount_minor  bigint not null check (amount_minor > 0 and amount_minor <= 9007199254740991),
  settled_on    date not null,
  note          text check (char_length(note) <= 200),
  created_at    timestamptz not null default now(),
  check (from_person <> to_person),
  foreign key (from_person, group_id) references public.split_people (id, group_id) on delete cascade,
  foreign key (to_person, group_id) references public.split_people (id, group_id) on delete cascade
);
create index split_settlements_group_idx on public.split_settlements (group_id, settled_on desc);

alter table public.split_groups      enable row level security;
alter table public.split_people      enable row level security;
alter table public.split_expenses    enable row level security;
alter table public.split_shares      enable row level security;
alter table public.split_settlements enable row level security;

create policy split_groups_owner on public.split_groups for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- The exists() calls run under RLS, so a row can only point at a group the user owns.
create policy split_people_owner on public.split_people for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.split_groups g where g.id = group_id));
create policy split_expenses_owner on public.split_expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.split_groups g where g.id = group_id));
create policy split_shares_owner on public.split_shares for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.split_groups g where g.id = group_id));
create policy split_settlements_owner on public.split_settlements for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.split_groups g where g.id = group_id));

revoke all on public.split_groups, public.split_people, public.split_expenses, public.split_shares, public.split_settlements
  from anon, authenticated, service_role;
grant select, insert, update, delete on public.split_groups, public.split_people, public.split_expenses, public.split_shares, public.split_settlements to authenticated;
