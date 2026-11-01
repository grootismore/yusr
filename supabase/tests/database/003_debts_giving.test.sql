-- RLS, constraints and encrypted-field tests for migration 003.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ------------------------------------------------------------------ fixtures
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());

insert into public.accounts (id, user_id, name, type) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A cash', 'cash'),
  ('b1b1b1b1-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B cash', 'cash');

insert into public.debts (id, user_id, lender, kind, original_laari, balance_laari, min_payment_laari) values
  ('d1d1d1d1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A lender', 'bank', 1000000, 800000, 50000),
  ('d1d1d1d1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B lender', 'bank', 500000, 500000, 20000);
insert into public.receivables (id, user_id, debtor, amount_laari) values
  ('e1e1e1e1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A debtor', 10000),
  ('e1e1e1e1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B debtor', 20000);
insert into public.commitments (id, user_id, type, amount_laari, schedule) values
  ('c1c1c1c1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sadaqah', 5000, 'weekly_friday'),
  ('c1c1c1c1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'zakat', 90000, 'ramadan');
insert into public.recurring_items (id, user_id, name, kind, amount_laari, category_id, account_id, schedule, day_of_month, next_due_on)
select 'f1f1f1f1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A rent', 'expense', 700000, id,
       'a1a1a1a1-0000-0000-0000-000000000001', 'monthly', 1, '2026-12-01'
from public.categories where name_en = 'Rent' and is_default;
insert into public.recurring_items (id, user_id, name, kind, amount_laari, category_id, account_id, schedule, day_of_month, next_due_on)
select 'f1f1f1f1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B rent', 'expense', 900000, id,
       'b1b1b1b1-0000-0000-0000-000000000001', 'monthly', 1, '2026-12-01'
from public.categories where name_en = 'Rent' and is_default;
insert into public.categories (id, user_id, name_en, name_dv, kind, is_default) values
  ('c0c0c0c0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B custom', 'B custom', 'expense', false);

select is((select count(*) from public.categories where is_default), 13::bigint, 'the Debt payment default category exists (13 defaults)');

-- ------------------------------------------------------------------ as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.debts), 1::bigint, 'A sees only own debt');
select is((select count(*) from public.receivables), 1::bigint, 'A sees only own receivable');
select is((select count(*) from public.commitments), 1::bigint, 'A sees only own commitment');
select is((select count(*) from public.recurring_items), 1::bigint, 'A sees only own recurring item');

select throws_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'bank', 1, 1)$$, '42501', null, 'A cannot insert a debt for B');
select throws_ok($$insert into public.receivables (user_id, debtor, amount_laari)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 1)$$, '42501', null, 'A cannot insert a receivable for B');
select throws_ok($$insert into public.commitments (user_id, type, amount_laari, schedule)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sadaqah', 1, 'weekly_friday')$$, '42501', null, 'A cannot insert a commitment for B');
select throws_ok($$insert into public.recurring_items (user_id, name, kind, amount_laari, category_id, account_id, schedule, day_of_month, next_due_on)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'expense', 1, id, 'b1b1b1b1-0000-0000-0000-000000000001', 'monthly', 1, '2026-12-01'
  from public.categories where name_en = 'Rent'$$, '42501', null, 'A cannot insert a recurring item for B');

select lives_ok($$update public.debts set lender = 'hacked' where id = 'd1d1d1d1-0000-0000-0000-00000000000b'$$, 'A update of B debt is a no-op');
select lives_ok($$update public.receivables set debtor = 'hacked' where id = 'e1e1e1e1-0000-0000-0000-00000000000b'$$, 'A update of B receivable is a no-op');
select lives_ok($$update public.commitments set amount_laari = 1 where id = 'c1c1c1c1-0000-0000-0000-00000000000b'$$, 'A update of B commitment is a no-op');
select lives_ok($$update public.recurring_items set name = 'hacked' where id = 'f1f1f1f1-0000-0000-0000-00000000000b'$$, 'A update of B recurring item is a no-op');
select lives_ok($$delete from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000b'$$, 'A delete of B debt is a no-op');
select lives_ok($$delete from public.receivables where id = 'e1e1e1e1-0000-0000-0000-00000000000b'$$, 'A delete of B receivable is a no-op');
select lives_ok($$delete from public.commitments where id = 'c1c1c1c1-0000-0000-0000-00000000000b'$$, 'A delete of B commitment is a no-op');
select lives_ok($$delete from public.recurring_items where id = 'f1f1f1f1-0000-0000-0000-00000000000b'$$, 'A delete of B recurring item is a no-op');
select throws_ok($$update public.debts set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'd1d1d1d1-0000-0000-0000-00000000000a'$$,
  '42501', null, 'A cannot hand a debt to B');

-- Secret-id columns are not writable by clients (would let A point at B's encrypted values).
select throws_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari, reference_secret_id)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'bank', 1, 1, gen_random_uuid())$$,
  '42501', null, 'A cannot set reference_secret_id on insert');
select throws_ok($$update public.debts set notes_secret_id = gen_random_uuid() where id = 'd1d1d1d1-0000-0000-0000-00000000000a'$$,
  '42501', null, 'A cannot set notes_secret_id on update');

-- Links between transactions and debts/commitments.
select lives_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, debt_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 50000, 'expense', '2026-11-01',
         'd1d1d1d1-0000-0000-0000-00000000000a' from public.categories where name_en = 'Debt payment'$$, 'A can log a payment against own debt');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, debt_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 50000, 'expense', '2026-11-01',
         'd1d1d1d1-0000-0000-0000-00000000000b' from public.categories where name_en = 'Debt payment'$$,
  '23503', null, 'A cannot log a payment against B debt');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, commitment_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 5000, 'giving', '2026-11-01',
         'c1c1c1c1-0000-0000-0000-00000000000b' from public.categories where name_en = 'Islamic giving'$$,
  '23503', null, 'A cannot mark B commitment done');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, debt_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 1, 'income', '2026-11-01',
         'd1d1d1d1-0000-0000-0000-00000000000a' from public.categories where name_en = 'Salary'$$,
  '23514', null, 'a debt payment must be an expense');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, commitment_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 1, 'expense', '2026-11-01',
         'c1c1c1c1-0000-0000-0000-00000000000a' from public.categories where name_en = 'Groceries'$$,
  '23514', null, 'a commitment transaction must be giving');
select lives_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, commitment_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 5000, 'giving', '2026-11-01',
         'c1c1c1c1-0000-0000-0000-00000000000a' from public.categories where name_en = 'Islamic giving'$$, 'A can mark own commitment done');

-- Constraints.
select throws_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari, interest_rate_bps)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'bank', 1, 1, 500)$$, '23514', null, 'a rate needs the interest-bearing flag');
select throws_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari, due_day)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'bank', 1, 1, 32)$$, '23514', null, 'due_day must be 1-31');
select throws_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'bank', 1, -1)$$, '23514', null, 'balance cannot be negative');
select throws_ok($$insert into public.commitments (user_id, type, amount_laari, schedule)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sadaqah', 100, 'once')$$, '23514', null, 'a one-off commitment needs a date');
select throws_ok($$insert into public.commitments (user_id, type, amount_laari, schedule)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sadaqah', 100, 'monthly')$$, '23514', null, 'a monthly commitment needs a day');
select throws_ok($$insert into public.recurring_items (user_id, name, kind, amount_laari, category_id, account_id, schedule, next_due_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'expense', 1, id, 'a1a1a1a1-0000-0000-0000-000000000001', 'monthly', '2026-12-01'
  from public.categories where name_en = 'Rent'$$, '23514', null, 'a monthly recurring item needs a day');
select throws_ok($$insert into public.recurring_items (user_id, name, kind, amount_laari, category_id, account_id, schedule, day_of_month, next_due_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'expense', 1, id, 'b1b1b1b1-0000-0000-0000-000000000001', 'monthly', 1, '2026-12-01'
  from public.categories where name_en = 'Rent'$$, '23503', null, 'a recurring item cannot use B account');
select throws_ok($$insert into public.recurring_items (user_id, name, kind, amount_laari, category_id, account_id, schedule, day_of_month, next_due_on)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'expense', 1, 'c0c0c0c0-0000-0000-0000-00000000000b',
          'a1a1a1a1-0000-0000-0000-000000000001', 'monthly', 1, '2026-12-01')$$, '23503', null, 'a recurring item cannot use B custom category');
select throws_ok($$insert into public.recurring_items (user_id, name, kind, amount_laari, category_id, account_id, schedule, day_of_month, next_due_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'income', 1, id, 'a1a1a1a1-0000-0000-0000-000000000001', 'monthly', 1, '2026-12-01'
  from public.categories where name_en = 'Rent'$$, '23514', null, 'recurring kind must match its category kind');

-- Encrypted debt fields.
select lives_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', 'REF-123', 'call Ali first')$$, 'A can store secrets on own debt');
select results_eq($$select reference_no, notes from public.get_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a')$$,
  $$values ('REF-123'::text, 'call Ali first'::text)$$, 'A reads own secrets back');
select lives_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', 'REF-456', 'call Ali first')$$, 'A can update secrets');
select results_eq($$select reference_no from public.get_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a')$$,
  $$values ('REF-456'::text)$$, 'update replaces the reference');
select throws_ok($$select public.get_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000b')$$, '42501', null, 'A cannot read B secrets');
select throws_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000b', 'x', 'y')$$, '42501', null, 'A cannot write B secrets');
select throws_ok($$select * from vault.secrets$$, '42501', null, 'clients cannot read the vault directly');
select throws_ok($$select * from vault.decrypted_secrets$$, '42501', null, 'clients cannot read decrypted secrets directly');

-- ------------------------------------------------------------------ as user B
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select is((select count(*) from public.debts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot read A debts');
select is((select count(*) from public.commitments where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot read A commitments');
select throws_ok($$select public.get_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a')$$, '42501', null, 'B cannot read A secrets');
select throws_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', 'x', 'y')$$, '42501', null, 'B cannot overwrite A secrets');

-- ------------------------------------------------------------------ as anon
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

select throws_ok('select * from public.debts', '42501', null, 'anon cannot read debts');
select throws_ok('select * from public.receivables', '42501', null, 'anon cannot read receivables');
select throws_ok('select * from public.commitments', '42501', null, 'anon cannot read commitments');
select throws_ok('select * from public.recurring_items', '42501', null, 'anon cannot read recurring items');
select throws_ok($$select public.get_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a')$$, '42501', null, 'anon cannot call get_debt_secrets');
select throws_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', 'x', 'y')$$, '42501', null, 'anon cannot call set_debt_secrets');

-- ----------------------------------- A and B data untouched; secrets at rest
reset role;
select is((select lender from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000b'), 'B lender', 'B debt unchanged by A');
select is((select count(*) from public.receivables where id = 'e1e1e1e1-0000-0000-0000-00000000000b' and debtor = 'B debtor'), 1::bigint, 'B receivable unchanged by A');
select is((select amount_laari from public.commitments where id = 'c1c1c1c1-0000-0000-0000-00000000000b'), 90000::bigint, 'B commitment unchanged by A');
select is((select name from public.recurring_items where id = 'f1f1f1f1-0000-0000-0000-00000000000b'), 'B rent', 'B recurring item unchanged by A');

select is((select count(*) from vault.secrets where name like 'debt:d1d1d1d1-0000-0000-0000-00000000000a:%'), 2::bigint, 'two secrets stored for the debt');
select isnt((select secret from vault.secrets where name = 'debt:d1d1d1d1-0000-0000-0000-00000000000a:reference'), 'REF-456',
  'the reference number is not stored as plaintext');
select isnt((select secret from vault.secrets where name = 'debt:d1d1d1d1-0000-0000-0000-00000000000a:notes'), 'call Ali first',
  'the notes are not stored as plaintext');

-- Clearing a value removes its secret.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', '', 'call Ali first')$$, 'A can clear the reference');
reset role;
select is((select count(*) from vault.secrets where name = 'debt:d1d1d1d1-0000-0000-0000-00000000000a:reference'), 0::bigint, 'clearing removes the secret');

-- Deleting the debt, or the whole account, leaves no secrets behind.
delete from public.transactions where debt_id = 'd1d1d1d1-0000-0000-0000-00000000000a';
delete from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000a';
select is((select count(*) from vault.secrets where name like 'debt:d1d1d1d1-0000-0000-0000-00000000000a:%'), 0::bigint, 'deleting a debt deletes its secrets');

-- Account deletion (cascade from auth.users) must remove encrypted secrets too.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000b', 'B-REF', 'B notes')$$, 'B stores secrets on own debt');
reset role;
select is((select count(*) from vault.secrets where name like 'debt:d1d1d1d1-0000-0000-0000-00000000000b:%'), 2::bigint, 'B secrets stored');
delete from public.transactions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
delete from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select is((select count(*) from vault.secrets where name like 'debt:d1d1d1d1-0000-0000-0000-00000000000b:%'), 0::bigint, 'deleting the account deletes its secrets');
select is((select count(*) from public.debts where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'deleting the account deletes its debts');

select * from finish();
rollback;
