-- Migration 004: Debt-free plan (debts, debt_payments).
-- Money is integer laari. Debt is an amanah: the schema flags interest-bearing debts as a plain
-- fact (no judgement) and has an interest-free qard hasan kind that can never be interest-bearing.
-- Same owner pattern as the core tables: user_id = auth.uid().

create table public.debts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  lender                text not null check (char_length(lender) between 1 and 100),
  kind                  text not null check (kind in ('bank', 'loan', 'credit_card', 'personal', 'qard_hasan')),
  -- What was owed when it was added. The current balance is this minus payments (view below).
  opening_balance_laari bigint not null check (opening_balance_laari > 0 and opening_balance_laari <= 9007199254740991),
  min_payment_laari     bigint not null default 0 check (min_payment_laari between 0 and 9007199254740991),
  due_day               smallint check (due_day between 1 and 31),
  interest_bearing      boolean not null default false,
  -- Annual rate in basis points (1250 = 12.5%), only used to project the payoff date.
  interest_rate_bps     integer check (interest_rate_bps between 0 and 20000),
  started_on            date,
  -- Included in the Wasiyyah & Amanah register that trusted contacts see after a confirmed release.
  in_register           boolean not null default true,
  -- Plain text, not encrypted: the app tells people not to put account numbers or passwords here.
  notes                 text check (char_length(notes) <= 300),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (not (kind = 'qard_hasan' and interest_bearing)),
  check (interest_rate_bps is null or interest_bearing),
  -- Target for the composite FK from debt_payments (ownership integrity).
  unique (id, user_id)
);

create index debts_user_id_idx on public.debts (user_id);
create trigger debts_updated_at before update on public.debts
  for each row execute function public.set_updated_at();

create table public.debt_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  debt_id       uuid not null,
  amount_laari  bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  paid_on       date not null,
  note          text check (char_length(note) <= 200),
  created_at    timestamptz not null default now(),
  -- A payment can only point at a debt owned by the same user.
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade
);

create index debt_payments_debt_idx on public.debt_payments (debt_id, paid_on desc);
create index debt_payments_user_idx on public.debt_payments (user_id);

-- Current balance, derived so it can never disagree with the payments. Runs with the caller's
-- rights, so RLS on both tables still applies.
create view public.debt_balances with (security_invoker = true) as
select d.id, d.user_id,
       coalesce(sum(p.amount_laari), 0)::bigint as paid_laari,
       greatest(d.opening_balance_laari - coalesce(sum(p.amount_laari), 0), 0)::bigint as balance_laari
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id, d.user_id, d.opening_balance_laari;

alter table public.debts         enable row level security;
alter table public.debt_payments enable row level security;

create policy debts_owner on public.debts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy debt_payments_owner on public.debt_payments for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.debts, public.debt_payments to authenticated;
grant select on public.debt_balances to authenticated;
