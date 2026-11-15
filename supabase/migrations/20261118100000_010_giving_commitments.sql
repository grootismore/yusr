-- Migration 010: monthly giving commitments.
-- A commitment is a standing monthly gift ("MVR 700 each month to Alooka School, sponsorship of Lama") that stays on
-- the Giving screen until the person ends it. Nothing is paid automatically: each month the person marks it paid,
-- which records an ordinary giving entry (an expense plus a sadaqah_entries row) linked to the commitment and the month.
-- The unique index makes "mark paid" safe to repeat: a commitment can be paid once per month.

create table public.giving_commitments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  recipient     text not null check (char_length(recipient) between 1 and 100),
  note          text check (char_length(note) <= 200),
  amount_laari  bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  kind          text not null default 'sadaqah' check (kind in ('sadaqah', 'jariyah')),
  -- The day each month the gift is due. 1 to 28 so it exists in every month.
  due_day       smallint not null default 1 check (due_day between 1 and 28),
  started_on    date not null default current_date,
  -- null = until the person stops it. Ending keeps the history of what was paid.
  ended_on      date check (ended_on is null or ended_on >= started_on),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index giving_commitments_user_idx on public.giving_commitments (user_id, created_at desc);

create trigger giving_commitments_updated_at before update on public.giving_commitments
  for each row execute function public.set_updated_at();

alter table public.sadaqah_entries
  add column commitment_id uuid references public.giving_commitments (id) on delete set null,
  add column period        date check (period is null or period = date_trunc('month', period)::date);

create unique index sadaqah_entries_commitment_period on public.sadaqah_entries (commitment_id, period) where commitment_id is not null;

alter table public.giving_commitments enable row level security;
create policy giving_commitments_owner on public.giving_commitments for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.giving_commitments from anon, authenticated, service_role;
grant select, insert, update, delete on public.giving_commitments to authenticated;
