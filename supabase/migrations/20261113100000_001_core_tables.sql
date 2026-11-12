-- Migration 001: Kharadhu core tables (PRD "Data model").
-- Money is integer laari (100 per MVR), never floats. RLS is on for every table; the owner
-- policy is user_id = auth.uid(). Default categories (user_id null) are readable by everyone.

-- Hosted projects ship an event-trigger helper public.rls_auto_enable(); it must never be
-- callable through the REST API. Guarded so it is a no-op where the function does not exist.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- ---------------------------------------------------------------- helpers

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  language            text not null default 'dv' check (language in ('dv', 'en')),
  base_currency       text not null default 'MVR' check (base_currency ~ '^[A-Z]{3}$'),
  -- Opt-in. Default: the receipt photo is deleted once extraction succeeds.
  keep_receipt_images boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- A profile row is created automatically for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------- categories
-- user_id is null for the built-in defaults. `slug` is the stable key the scanner suggests.

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  slug        text check (slug ~ '^[a-z-]{1,40}$'),
  name_dv     text not null check (char_length(name_dv) between 1 and 100),
  name_en     text not null check (char_length(name_en) between 1 and 100),
  icon        text not null default 'ellipsis',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Defaults have a slug and no owner; user categories have an owner and no slug.
  check ((user_id is null) = (slug is not null))
);

create unique index categories_default_slug_idx on public.categories (slug) where user_id is null;
create index categories_user_id_idx on public.categories (user_id);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- Dhivehi names are DRAFTS for native-speaker review before release.
insert into public.categories (user_id, slug, name_en, name_dv, icon) values
  (null, 'food-groceries', 'Food and groceries',  'ކާބޯތަކެތި',                 'cart'),
  (null, 'transport',      'Transport',           'ދަތުރުފަތުރު',               'boat'),
  (null, 'bills',          'Bills',               'ބިލްތައް',                   'flash'),
  (null, 'rent',           'Rent',                'ކުލި',                       'home'),
  (null, 'health',         'Health',              'ސިއްހަތު',                   'medkit'),
  (null, 'education',      'Education',           'ތައުލީމު',                   'school'),
  (null, 'shopping',       'Shopping',            'ޝޮޕިންގ',                    'bag'),
  (null, 'family-support', 'Family support',      'ޢާއިލާއަށް އެހީތެރިވުން',      'people'),
  (null, 'giving',         'Giving',              'ދިނުން',                     'gift'),
  (null, 'other',          'Other',               'އެހެނިހެން',                  'ellipsis');

-- ---------------------------------------------------------------- receipts

create table public.receipts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Null once the photo is deleted (the default after extraction).
  image_path  text check (image_path like user_id::text || '/%'),
  status      text not null default 'confirmed' check (status in ('confirmed', 'needs_review')),
  -- The draft exactly as the scanner returned it, kept to measure accuracy.
  raw_json    jsonb,
  scan_model  text,
  gst_laari   bigint check (gst_laari between 0 and 9007199254740991),
  created_at  timestamptz not null default now()
);

create index receipts_user_id_idx on public.receipts (user_id, created_at desc);

create table public.receipt_items (
  id               uuid primary key default gen_random_uuid(),
  receipt_id       uuid not null references public.receipts (id) on delete cascade,
  -- Duplicated from the receipt so the owner policy is a plain column check.
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 200),
  qty              numeric(12, 3) not null default 1 check (qty > 0),
  unit_price_laari bigint check (unit_price_laari between 0 and 9007199254740991),
  total_laari      bigint not null check (total_laari between 0 and 9007199254740991)
);

create index receipt_items_receipt_id_idx on public.receipt_items (receipt_id);

-- ---------------------------------------------------------------- expenses

create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- In `currency`, 100 minor units per major unit.
  amount_laari    bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  currency        text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  -- Rate used at entry (user can override). Stored, never looked up later.
  fx_rate_to_mvr  numeric(18, 8) not null default 1 check (fx_rate_to_mvr > 0),
  -- MVR value used by budgets and reports, derived so it can never disagree.
  mvr_laari       bigint generated always as (round(amount_laari * fx_rate_to_mvr)::bigint) stored,
  category_id     uuid references public.categories (id) on delete set null,
  merchant        text check (char_length(merchant) <= 200),
  spent_at        date not null,
  note            text check (char_length(note) <= 500),
  source          text not null default 'manual' check (source in ('manual', 'scan')),
  receipt_id      uuid references public.receipts (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (currency <> 'MVR' or fx_rate_to_mvr = 1)
);

create index expenses_user_date_idx on public.expenses (user_id, spent_at desc);
create index expenses_category_id_idx on public.expenses (category_id);
create index expenses_receipt_id_idx on public.expenses (receipt_id);

create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ income

create table public.income (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  amount_laari    bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  currency        text not null default 'MVR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_mvr  numeric(18, 8) not null default 1 check (fx_rate_to_mvr > 0),
  mvr_laari       bigint generated always as (round(amount_laari * fx_rate_to_mvr)::bigint) stored,
  received_at     date not null,
  note            text check (char_length(note) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (currency <> 'MVR' or fx_rate_to_mvr = 1)
);

create index income_user_date_idx on public.income (user_id, received_at desc);

create trigger income_updated_at before update on public.income
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------- budgets
-- month is the first day of the month. category_id null = the overall monthly budget.

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  month         date not null check (extract(day from month) = 1),
  category_id   uuid references public.categories (id) on delete cascade,
  limit_laari   bigint not null check (limit_laari > 0 and limit_laari <= 9007199254740991),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique nulls not distinct (user_id, month, category_id)
);

create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- scan_usage
-- Written only by the scan-receipt function through the functions in migration 002.

create table public.scan_usage (
  user_id     uuid not null references auth.users (id) on delete cascade,
  month       date not null check (extract(day from month) = 1),
  scans_used  integer not null default 0 check (scans_used >= 0),
  primary key (user_id, month)
);

-- --------------------------------------------------------------------- RLS

alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.receipts      enable row level security;
alter table public.receipt_items enable row level security;
alter table public.expenses      enable row level security;
alter table public.income       enable row level security;
alter table public.budgets       enable row level security;
alter table public.scan_usage    enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Defaults are readable by everyone, including signed-out users.
create policy categories_select on public.categories for select to anon, authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy categories_insert on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy categories_update on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy categories_delete on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

create policy receipts_owner on public.receipts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The exists() runs under RLS, so a user cannot attach items to someone else's receipt.
create policy receipt_items_owner on public.receipt_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.receipts r where r.id = receipt_id));

-- category_id / receipt_id must point at rows the user can see (own or default).
create policy expenses_owner on public.expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id))
              and (receipt_id is null or exists (select 1 from public.receipts r where r.id = receipt_id)));

create policy income_owner on public.income for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy budgets_owner on public.budgets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and (category_id is null or exists (select 1 from public.categories c where c.id = category_id)));

-- Users may read their own usage (for "N / 10 scans left"). No write policy exists.
create policy scan_usage_select on public.scan_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------ grants
-- Be explicit: the anon role gets nothing on user data; the server role gets nothing by default.

revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;

grant select on public.categories to anon;
grant select, update (language, base_currency, keep_receipt_images) on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.receipts, public.receipt_items,
  public.expenses, public.income, public.budgets to authenticated;
grant select on public.scan_usage to authenticated;
