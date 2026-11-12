-- Migration 003: debts, receivables, giving commitments, recurring items.
-- PRD §3.2-3.5, §8, §9. Money is integer laari. RLS on every table.
--
-- Design notes
-- * A debt's CURRENT balance is derived, never stored:
--     current = debts.balance_laari - sum(live payments, i.e. transactions.debt_id = debt.id)
--   debts.balance_laari is the balance when tracking started (or was last corrected),
--   so the balance cannot drift from the payments and works offline.
-- * Debt reference numbers and notes are encrypted at rest with Supabase Vault. The
--   table keeps only the secret ids; clients read/write the text through
--   security-definer functions that check ownership. Clients can NOT write the id
--   columns (column grants), so one user can never point a debt at another's secret.
--   Honest limit (PRD §9): the project owner / database admin can still decrypt.

-- ------------------------------------------------------------------- debts

create table public.debts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  lender               text not null check (char_length(lender) between 1 and 100),
  kind                 text not null check (kind in ('bank', 'person', 'store', 'other')),
  original_laari       bigint not null check (original_laari between 0 and 9007199254740991),
  balance_laari        bigint not null check (balance_laari between 0 and 9007199254740991),
  min_payment_laari    bigint not null default 0 check (min_payment_laari between 0 and 9007199254740991),
  due_day              smallint check (due_day between 1 and 31),
  is_interest_bearing  boolean not null default false,
  -- Optional annual rate in basis points (1250 = 12.5%). Only meaningful for interest-bearing debt.
  interest_rate_bps    integer check (interest_rate_bps between 0 and 100000),
  reference_secret_id  uuid,
  notes_secret_id      uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  check (interest_rate_bps is null or is_interest_bearing),
  unique (id, user_id)
);

create index debts_user_id_idx on public.debts (user_id);
create trigger debts_updated_at before update on public.debts
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- receivables

create table public.receivables (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  debtor      text not null check (char_length(debtor) between 1 and 100),
  amount_laari bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  due_on      date,
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Archiving a receivable means it has been received or written off.
  deleted_at  timestamptz
);

create index receivables_user_id_idx on public.receivables (user_id);
create trigger receivables_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- commitments

create table public.commitments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  type             text not null check (type in ('sadaqah', 'zakat', 'fitr', 'fidya', 'kaffarah', 'jariyah')),
  amount_laari     bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  schedule         text not null check (schedule in ('once', 'weekly_friday', 'monthly', 'ramadan', 'dhul_hijjah')),
  due_on           date,
  day_of_month     smallint check (day_of_month between 1 and 31),
  recipient_note   text check (char_length(recipient_note) <= 500),
  reminder_enabled boolean not null default true,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  check (schedule <> 'once' or due_on is not null),
  check (schedule <> 'monthly' or day_of_month is not null),
  unique (id, user_id)
);

create index commitments_user_id_idx on public.commitments (user_id);
create trigger commitments_updated_at before update on public.commitments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- recurring_items

create table public.recurring_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  kind          text not null check (kind in ('income', 'expense')),
  amount_laari  bigint not null check (amount_laari > 0 and amount_laari <= 9007199254740991),
  category_id   uuid not null references public.categories (id),
  account_id    uuid not null,
  schedule      text not null check (schedule in ('weekly', 'monthly')),
  day_of_month  smallint check (day_of_month between 1 and 31),
  weekday       smallint check (weekday between 0 and 6),
  next_due_on   date not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  check ((schedule = 'monthly' and day_of_month is not null) or (schedule = 'weekly' and weekday is not null)),
  foreign key (account_id, user_id) references public.accounts (id, user_id)
);

create index recurring_items_user_id_idx on public.recurring_items (user_id);
create trigger recurring_items_updated_at before update on public.recurring_items
  for each row execute function public.set_updated_at();

-- Same rule as transactions: the category must be a default or the user's own, and match the kind.
create function public.check_recurring_category()
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
    raise exception 'recurring item kind % does not match category kind %', new.kind, cat.kind
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recurring_items_check_category before insert or update on public.recurring_items
  for each row execute function public.check_recurring_category();

-- ------------------------------------- link transactions to debts/commitments

-- Ownership integrity: a transaction can only reference the same user's debt/commitment.
alter table public.transactions
  add constraint transactions_debt_fk foreign key (debt_id, user_id) references public.debts (id, user_id),
  add constraint transactions_commitment_fk foreign key (commitment_id, user_id) references public.commitments (id, user_id),
  add constraint transactions_debt_is_expense check (debt_id is null or kind = 'expense'),
  add constraint transactions_commitment_is_giving check (commitment_id is null or kind = 'giving');

create index transactions_debt_idx on public.transactions (debt_id) where debt_id is not null;
create index transactions_commitment_idx on public.transactions (commitment_id) where commitment_id is not null;

-- ----------------------------------------------------- encrypted debt fields

create function public.set_debt_secrets(p_debt_id uuid, p_reference_no text, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.debts;
  ref_id uuid;
  notes_id uuid;
begin
  select * into d from public.debts where id = p_debt_id and user_id = (select auth.uid());
  if not found then
    raise exception 'debt not found' using errcode = '42501';
  end if;
  if char_length(coalesce(p_reference_no, '')) > 200 or char_length(coalesce(p_notes, '')) > 2000 then
    raise exception 'value too long' using errcode = '22001';
  end if;

  ref_id := d.reference_secret_id;
  if coalesce(p_reference_no, '') = '' then
    if ref_id is not null then delete from vault.secrets where id = ref_id; ref_id := null; end if;
  elsif ref_id is null then
    ref_id := vault.create_secret(p_reference_no, 'debt:' || p_debt_id || ':reference');
  else
    perform vault.update_secret(ref_id, p_reference_no);
  end if;

  notes_id := d.notes_secret_id;
  if coalesce(p_notes, '') = '' then
    if notes_id is not null then delete from vault.secrets where id = notes_id; notes_id := null; end if;
  elsif notes_id is null then
    notes_id := vault.create_secret(p_notes, 'debt:' || p_debt_id || ':notes');
  else
    perform vault.update_secret(notes_id, p_notes);
  end if;

  update public.debts set reference_secret_id = ref_id, notes_secret_id = notes_id where id = p_debt_id;
end;
$$;

create function public.get_debt_secrets(p_debt_id uuid)
returns table (reference_no text, notes text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.debts;
begin
  select * into d from public.debts where id = p_debt_id and user_id = (select auth.uid());
  if not found then
    raise exception 'debt not found' using errcode = '42501';
  end if;
  -- The secret's name must match this debt, as a second guard against a mixed-up id.
  return query select
    (select s.decrypted_secret from vault.decrypted_secrets s
       where s.id = d.reference_secret_id and s.name = 'debt:' || p_debt_id || ':reference'),
    (select s.decrypted_secret from vault.decrypted_secrets s
       where s.id = d.notes_secret_id and s.name = 'debt:' || p_debt_id || ':notes');
end;
$$;

-- Deleting a debt (including via account deletion) must not leave encrypted secrets behind.
create function public.delete_debt_secrets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id in (old.reference_secret_id, old.notes_secret_id);
  return old;
end;
$$;

create trigger debts_delete_secrets after delete on public.debts
  for each row execute function public.delete_debt_secrets();

revoke all on function public.set_debt_secrets(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_debt_secrets(uuid) from public, anon, authenticated;
revoke all on function public.delete_debt_secrets() from public, anon, authenticated;
grant execute on function public.set_debt_secrets(uuid, text, text) to authenticated;
grant execute on function public.get_debt_secrets(uuid) to authenticated;

-- ------------------------------------------------------------------- grants

revoke all on public.debts, public.receivables, public.commitments, public.recurring_items
  from anon, authenticated;

-- Debts: clients may not write the secret-id columns or the server-owned timestamps.
grant select, delete on public.debts to authenticated;
grant insert (id, user_id, lender, kind, original_laari, balance_laari, min_payment_laari, due_day,
              is_interest_bearing, interest_rate_bps)
  on public.debts to authenticated;
grant update (id, user_id, lender, kind, original_laari, balance_laari, min_payment_laari, due_day,
              is_interest_bearing, interest_rate_bps, deleted_at)
  on public.debts to authenticated;

grant select, insert, update, delete on public.receivables, public.commitments, public.recurring_items
  to authenticated;

-- --------------------------------------------------------------------- RLS

alter table public.debts           enable row level security;
alter table public.receivables     enable row level security;
alter table public.commitments     enable row level security;
alter table public.recurring_items enable row level security;

alter table public.debts           force row level security;
alter table public.receivables     force row level security;
alter table public.commitments     force row level security;
alter table public.recurring_items force row level security;

create policy debts_select_own on public.debts
  for select to authenticated using (user_id = (select auth.uid()));
create policy debts_insert_own on public.debts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy debts_update_own on public.debts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy debts_delete_own on public.debts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy receivables_select_own on public.receivables
  for select to authenticated using (user_id = (select auth.uid()));
create policy receivables_insert_own on public.receivables
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy receivables_update_own on public.receivables
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy receivables_delete_own on public.receivables
  for delete to authenticated using (user_id = (select auth.uid()));

create policy commitments_select_own on public.commitments
  for select to authenticated using (user_id = (select auth.uid()));
create policy commitments_insert_own on public.commitments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy commitments_update_own on public.commitments
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy commitments_delete_own on public.commitments
  for delete to authenticated using (user_id = (select auth.uid()));

create policy recurring_items_select_own on public.recurring_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy recurring_items_insert_own on public.recurring_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy recurring_items_update_own on public.recurring_items
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy recurring_items_delete_own on public.recurring_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- ------------------------------------------------------- default category
-- Draft Dhivehi name; needs native-speaker review before launch.

insert into public.categories (user_id, name_en, name_dv, kind, is_default) values
  (null, 'Debt payment', 'ދަރަނި ދެއްކުން', 'expense', true);
