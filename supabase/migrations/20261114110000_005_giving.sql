-- Migration 005: Sadaqah and zakat (sadaqah_entries, zakat_settings).
-- Guidance only: nothing here computes a ruling. A giving entry is an ordinary expense in the
-- Giving category plus this row, so the amount lives in one place (expenses) and cannot drift.

create table public.sadaqah_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- The expense that holds the amount and date. Deleting the expense removes the entry.
  expense_id      uuid not null unique references public.expenses (id) on delete cascade,
  kind            text not null default 'sadaqah' check (kind in ('sadaqah', 'zakat', 'fitr', 'fidya', 'kaffarah', 'jariyah')),
  -- Private; never shown to anyone else, and not part of the release register.
  recipient_note  text check (char_length(recipient_note) <= 200),
  created_at      timestamptz not null default now()
);

create index sadaqah_entries_user_idx on public.sadaqah_entries (user_id);

-- One row per user: the monthly sadaqah goal and the zakat reminder date.
create table public.zakat_settings (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  sadaqah_goal_laari   bigint check (sadaqah_goal_laari > 0 and sadaqah_goal_laari <= 9007199254740991),
  -- The person's own zakat date (their hawl anniversary) as a Hijri month and day.
  zakat_hijri_month    smallint check (zakat_hijri_month between 1 and 12),
  zakat_hijri_day      smallint check (zakat_hijri_day between 1 and 30),
  zakat_reminder       boolean not null default false,
  -- Moon sighting can differ by a day: manual adjustment of the Hijri date.
  hijri_adjustment     smallint not null default 0 check (hijri_adjustment between -1 and 1),
  updated_at           timestamptz not null default now(),
  check ((zakat_hijri_month is null) = (zakat_hijri_day is null))
);

create trigger zakat_settings_updated_at before update on public.zakat_settings
  for each row execute function public.set_updated_at();

alter table public.sadaqah_entries enable row level security;
alter table public.zakat_settings  enable row level security;

-- The exists() runs under RLS, so an entry can only point at an expense the user owns.
create policy sadaqah_entries_owner on public.sadaqah_entries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.expenses e where e.id = expense_id));
create policy zakat_settings_owner on public.zakat_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.sadaqah_entries, public.zakat_settings to authenticated;
