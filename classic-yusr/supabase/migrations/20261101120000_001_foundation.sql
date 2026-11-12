-- Migration 001: foundation (profiles, accounts, categories, transactions)
-- PRD §8. Money is integer laari (100 per MVR), never floats.
-- RLS is enabled on every table; owner policy is user_id = auth.uid().

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
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users (id) on delete cascade,
  language        text not null default 'en' check (language in ('en', 'dv')),
  currency        text not null default 'MVR' check (currency in ('MVR', 'USD')),
  hijri_adjustment smallint not null default 0 check (hijri_adjustment between -1 and 1),
  privacy_mode    boolean not null default false,
  -- Server-owned (release flow, PRD §5). Clients cannot write these two columns.
  last_active_at  timestamptz not null default now(),
  away_until      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
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
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- accounts

create table public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 100),
  type                  text not null check (type in ('cash', 'bml', 'mcb', 'sdfc', 'mib', 'other')),
  opening_balance_laari bigint not null default 0
                        check (opening_balance_laari between -9007199254740991 and 9007199254740991),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  -- Target for the composite FK from transactions (ownership integrity).
  unique (id, user_id)
);

create index accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- categories
-- user_id is null for the built-in defaults, which every user can read.

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  name_en     text not null check (char_length(name_en) between 1 and 100),
  name_dv     text not null check (char_length(name_dv) between 1 and 100),
  kind        text not null check (kind in ('income', 'expense', 'giving')),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  check (is_default = (user_id is null))
);

create index categories_user_id_idx on public.categories (user_id);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ transactions

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  account_id    uuid not null,
  category_id   uuid not null references public.categories (id),
  -- Always positive; `kind` carries the direction.
  amount_laari  bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  kind          text not null check (kind in ('income', 'expense', 'giving')),
  occurred_on   date not null,
  note          text check (char_length(note) <= 500),
  -- FKs to debts / commitments are added in the migrations that create those tables.
  debt_id       uuid,
  commitment_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  -- A transaction can only reference an account owned by the same user.
  foreign key (account_id, user_id) references public.accounts (id, user_id)
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc)
  where deleted_at is null;
create index transactions_account_idx on public.transactions (account_id);
create index transactions_category_idx on public.transactions (category_id);

create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- The category must be a default or owned by the same user, and its kind must
-- match the transaction kind. SECURITY INVOKER: RLS on categories already
-- limits visibility to defaults + the caller's own rows.
create function public.check_transaction_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat public.categories;
begin
  select * into cat from public.categories where id = new.category_id;
  if not found or (cat.user_id is not null and cat.user_id <> new.user_id) then
    raise exception 'category is not available to this user' using errcode = '23503';
  end if;
  if cat.kind <> new.kind then
    raise exception 'transaction kind % does not match category kind %', new.kind, cat.kind
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger transactions_check_category before insert or update on public.transactions
  for each row execute function public.check_transaction_category();

-- ------------------------------------------------------------------- grants
-- Least privilege: nothing for anon; authenticated gets only what policies allow.

revoke all on public.profiles, public.accounts, public.categories, public.transactions
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (language, currency, hijri_adjustment, privacy_mode) on public.profiles to authenticated;

grant select, insert, update, delete on public.accounts, public.categories, public.transactions
  to authenticated;

-- --------------------------------------------------------------------- RLS

alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

alter table public.profiles     force row level security;
alter table public.accounts     force row level security;
alter table public.categories   force row level security;
alter table public.transactions force row level security;

-- profiles: read and update own row only. No insert (trigger) or delete (cascade).
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- accounts
create policy accounts_select_own on public.accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy accounts_insert_own on public.accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy accounts_update_own on public.accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy accounts_delete_own on public.accounts
  for delete to authenticated using (user_id = (select auth.uid()));

-- categories: defaults are readable by everyone signed in, writable by no client.
create policy categories_select on public.categories
  for select to authenticated
  using (is_default or user_id = (select auth.uid()));
create policy categories_insert_own on public.categories
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not is_default);
create policy categories_update_own on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()) and not is_default)
  with check (user_id = (select auth.uid()) and not is_default);
create policy categories_delete_own on public.categories
  for delete to authenticated
  using (user_id = (select auth.uid()) and not is_default);

-- transactions
create policy transactions_select_own on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy transactions_delete_own on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ------------------------------------------------------- default categories
-- PRD §3.2 Maldivian defaults. Dhivehi (Thaana) names are DRAFTS and need
-- native-speaker review before launch (tracked in docs/LAUNCH_CHECKLIST.md).

insert into public.categories (user_id, name_en, name_dv, kind, is_default) values
  (null, 'Salary',                'މުސާރަ',                   'income',  true),
  (null, 'Allowance',             'އެލަވަންސް',               'income',  true),
  (null, 'Rent',                  'ކުލި',                     'expense', true),
  (null, 'STELCO',                'ސްޓެލްކޯ',                 'expense', true),
  (null, 'MWSC',                  'އެމްޑަބްލިއުއެސްސީ',        'expense', true),
  (null, 'Dhiraagu and Ooredoo',  'ދިރާގު އަދި އުރީޑޫ',        'expense', true),
  (null, 'Groceries',             'ކާބޯތަކެތި',                'expense', true),
  (null, 'Ferry and transport',   'ފެރީ އަދި ދަތުރުފަތުރު',    'expense', true),
  (null, 'School',                'ސްކޫލް',                   'expense', true),
  (null, 'Family support',        'ޢާއިލާއަށް އެހީތެރިވުން',    'expense', true),
  (null, 'Medical',               'ބޭސްފަރުވާ',                'expense', true),
  (null, 'Islamic giving',        'އިސްލާމީ ދިނުން',            'giving',  true);

-- ---------------------------------------------------------------- backfill
-- Users who signed up before this migration was applied (e.g. on a dev project)
-- get a profile too. A no-op on a fresh database.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;
