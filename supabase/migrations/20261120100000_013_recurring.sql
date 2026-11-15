-- Migration 013: recurring expenses and income (rent paid or received, subscriptions, bills, an allowance).
--
-- A recurring item says "this amount, every week / month / year, starting on this date". Each time it falls due the
-- app records one ordinary expense or income row (automatically, or when the person taps Record), and writes one
-- recurring_runs row saying "this item, this date, done". The unique (recurring_id, occurrence) makes recording safe to
-- repeat and safe from two phones. Deleting the expense or income afterwards (the tenant did not pay) keeps the run row,
-- so the app never records that date again. Skipping a date is a run with skipped = true.

create table public.recurring_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('expense', 'income')),
  name          text not null check (char_length(name) between 1 and 100),
  note          text check (char_length(note) <= 200),
  amount_minor  bigint not null check (amount_minor > 0 and amount_minor <= 9007199254740991),
  currency      text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  -- Expenses only: which category the recorded expense goes in.
  category_id   uuid references public.categories (id) on delete set null,
  every         text not null default 'month' check (every in ('week', 'month', 'year')),
  -- The first date, and the anchor for the rest: the same weekday, day of the month, or day of the year.
  starts_on     date not null default current_date,
  -- null = until the person stops it.
  ended_on      date check (ended_on is null or ended_on >= starts_on),
  -- true: the app records it on the day. false: it waits as "due" until the person taps Record or Skip.
  auto_add      boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (kind = 'expense' or category_id is null)
);

create index recurring_items_user_idx on public.recurring_items (user_id, created_at desc);
create trigger recurring_items_updated_at before update on public.recurring_items
  for each row execute function public.set_updated_at();

create table public.recurring_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  recurring_id  uuid not null references public.recurring_items (id) on delete cascade,
  occurrence    date not null,
  -- The row recorded for this date. Set null when the person deletes it, so the date is not recorded again.
  expense_id    uuid references public.expenses (id) on delete set null,
  income_id     uuid references public.income (id) on delete set null,
  skipped       boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (recurring_id, occurrence),
  check (expense_id is null or income_id is null),
  check (not skipped or (expense_id is null and income_id is null))
);

create index recurring_runs_user_idx on public.recurring_runs (user_id);

alter table public.recurring_items enable row level security;
alter table public.recurring_runs  enable row level security;

create policy recurring_items_owner on public.recurring_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));
-- The exists() calls run under RLS, so a run can only point at an item and rows the user owns.
create policy recurring_runs_owner on public.recurring_runs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.recurring_items r where r.id = recurring_id)
              and (expense_id is null or exists (select 1 from public.expenses e where e.id = expense_id))
              and (income_id is null or exists (select 1 from public.income i where i.id = income_id)));

revoke all on public.recurring_items, public.recurring_runs from anon, authenticated, service_role;
grant select, insert, update, delete on public.recurring_items, public.recurring_runs to authenticated;
