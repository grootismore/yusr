-- Migration 009: pay in more than one currency.
-- Income can be marked "kept in its own currency" (for example USD that is not exchanged yet), and the person can
-- record each later exchange to MVR. Holdings are worked out from these two tables; an exchange is never income and
-- never spending, so reports (which count the MVR value on payday) do not change when someone converts.

alter table public.income
  add column keep_in_currency boolean not null default false,
  add constraint income_keep_only_foreign check (not keep_in_currency or currency <> 'MVR');

create table public.conversions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- The foreign currency that was exchanged, in minor units (100 per unit), and the MVR received, in laari.
  currency      text not null check (currency ~ '^[A-Z]{3}$' and currency <> 'MVR'),
  amount_minor  bigint not null check (amount_minor > 0 and amount_minor <= 9007199254740991),
  mvr_laari     bigint not null check (mvr_laari > 0 and mvr_laari <= 9007199254740991),
  converted_at  date not null,
  note          text check (char_length(note) <= 500),
  created_at    timestamptz not null default now()
);

create index conversions_user_date_idx on public.conversions (user_id, converted_at desc);

alter table public.conversions enable row level security;
create policy conversions_owner on public.conversions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.conversions from anon, authenticated, service_role;
grant select, insert, update, delete on public.conversions to authenticated;
