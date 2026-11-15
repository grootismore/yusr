-- Migration 012: loans taken out of salary, and money pools.
--
-- 1. A debt can be "deducted from salary": the lender takes the monthly instalment before the pay arrives (common for
--    staff loans). The app then records each month's instalment itself, so the person never enters it by hand (and
--    never counts it twice). Those rows are marked source = 'auto' and carry the month they are for; the unique index
--    makes recording them safe to repeat or to do from two phones.
-- 2. A money pool (a rotating savings group among friends or family): each month the person puts in a fixed amount, in
--    MVR or another currency, and at some point takes the pot out. Each month's contribution is an ordinary expense in a
--    "Money pool" category plus a pool_payments row, so reports and budgets count it without any special case.

alter table public.debts
  add column auto_deducted boolean not null default false;

alter table public.debt_payments
  add column source text not null default 'manual' check (source in ('manual', 'auto')),
  add column period date check (period is null or period = date_trunc('month', period)::date),
  add constraint debt_payments_auto_has_period check (source <> 'auto' or period is not null);

create unique index debt_payments_auto_month on public.debt_payments (debt_id, period) where source = 'auto';

-- ------------------------------------------------------------------ money pools

create table public.money_pools (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  note          text check (char_length(note) <= 200),
  -- What the person puts in each month, in minor units of `currency`.
  amount_minor  bigint not null check (amount_minor > 0 and amount_minor <= 9007199254740991),
  currency      text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  due_day       smallint not null default 1 check (due_day between 1 and 28),
  -- How many people are in the pool, and the month the person takes the pot out (the first of that month). Both optional.
  members       smallint check (members between 2 and 200),
  payout_month  date check (payout_month is null or payout_month = date_trunc('month', payout_month)::date),
  -- Set once the person has recorded taking the pot out as income, so it is not recorded twice.
  payout_received boolean not null default false,
  started_on    date not null default current_date,
  ended_on      date check (ended_on is null or ended_on >= started_on),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index money_pools_user_idx on public.money_pools (user_id, created_at desc);
create trigger money_pools_updated_at before update on public.money_pools
  for each row execute function public.set_updated_at();

create table public.pool_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  pool_id     uuid not null references public.money_pools (id) on delete cascade,
  -- The expense that holds the amount and date. Deleting the expense removes this row.
  expense_id  uuid not null unique references public.expenses (id) on delete cascade,
  period      date not null check (period = date_trunc('month', period)::date),
  created_at  timestamptz not null default now(),
  unique (pool_id, period)
);

create index pool_payments_user_idx on public.pool_payments (user_id);

alter table public.money_pools   enable row level security;
alter table public.pool_payments enable row level security;

create policy money_pools_owner on public.money_pools for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- The exists() calls run under RLS, so a payment can only point at a pool and an expense the user owns.
create policy pool_payments_owner on public.pool_payments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.money_pools p where p.id = pool_id)
              and exists (select 1 from public.expenses e where e.id = expense_id));

revoke all on public.money_pools, public.pool_payments from anon, authenticated, service_role;
grant select, insert, update, delete on public.money_pools, public.pool_payments to authenticated;

-- A default category so pool contributions show up in budgets and reports.
insert into public.categories (user_id, slug, name_en, name_dv, icon)
values (null, 'money-pool', 'Money pool', 'ފައިސާ ޕޫލް', 'cash')
on conflict do nothing;
