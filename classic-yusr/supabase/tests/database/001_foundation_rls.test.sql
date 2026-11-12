-- RLS tests for migration 001. User A must never read or write user B's data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

-- ------------------------------------------------------------------ fixtures
-- Runs as the test owner (bypasses RLS). IDs are fixed so assertions are readable.
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());

insert into public.accounts (id, user_id, name, type) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A account', 'cash'),
  ('b1b1b1b1-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B account', 'bml');

insert into public.categories (id, user_id, name_en, name_dv, kind, is_default) values
  ('c0c0c0c0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A custom', 'A custom', 'expense', false),
  ('c0c0c0c0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B custom', 'B custom', 'expense', false);

insert into public.transactions (id, user_id, account_id, category_id, amount_laari, kind, occurred_on)
select 'd0d0d0d0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       'a1a1a1a1-0000-0000-0000-000000000001', id, 12500, 'expense', '2026-11-01'
from public.categories where name_en = 'Groceries' and is_default;

insert into public.transactions (id, user_id, account_id, category_id, amount_laari, kind, occurred_on)
select 'd0d0d0d0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       'b1b1b1b1-0000-0000-0000-000000000001', id, 99900, 'expense', '2026-11-01'
from public.categories where name_en = 'Groceries' and is_default;

select is((select count(*) from public.profiles
           where user_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
          2::bigint, 'a profile is created automatically for each new user');

-- ------------------------------------------------------------------ as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.profiles), 1::bigint, 'A sees exactly one profile (own)');
select is((select count(*) from public.accounts where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'A cannot read B accounts');
select is((select count(*) from public.accounts), 1::bigint, 'A sees only own account');
select is((select count(*) from public.transactions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'A cannot read B transactions');
select is((select count(*) from public.transactions), 1::bigint, 'A sees only own transaction');
select is((select count(*) from public.categories where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'A cannot read B custom categories');
select is((select count(*) from public.categories where is_default), 13::bigint, 'A can read the 13 default categories');

select throws_ok($$insert into public.accounts (user_id, name, type) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'cash')$$,
  '42501', null, 'A cannot insert an account for B');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1b1b1b1-0000-0000-0000-000000000001', id, 100, 'expense', '2026-11-01'
  from public.categories where name_en = 'Groceries'$$,
  '42501', null, 'A cannot insert a transaction for B');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b1b1b1b1-0000-0000-0000-000000000001', id, 100, 'expense', '2026-11-01'
  from public.categories where name_en = 'Groceries'$$,
  '23503', null, 'A cannot attach own transaction to B account');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', 'c0c0c0c0-0000-0000-0000-00000000000b', 100, 'expense', '2026-11-01')$$,
  '23503', null, 'A cannot use B custom category');
select throws_ok($$insert into public.categories (user_id, name_en, name_dv, kind, is_default) values (null, 'x', 'x', 'expense', true)$$,
  '42501', null, 'A cannot create a default category');
select throws_ok($$insert into public.categories (user_id, name_en, name_dv, kind) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'x', 'expense')$$,
  '42501', null, 'A cannot create a category for B');

select lives_ok($$update public.accounts set name = 'hacked' where id = 'b1b1b1b1-0000-0000-0000-000000000001'$$, 'A update of B account is a silent no-op');
select lives_ok($$update public.transactions set amount_laari = 1 where id = 'd0d0d0d0-0000-0000-0000-00000000000b'$$, 'A update of B transaction is a silent no-op');
select lives_ok($$update public.profiles set language = 'dv' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$, 'A update of B profile is a silent no-op');
select lives_ok($$update public.categories set name_en = 'hacked' where id = 'c0c0c0c0-0000-0000-0000-00000000000b'$$, 'A update of B category is a silent no-op');
select lives_ok($$delete from public.accounts where id = 'b1b1b1b1-0000-0000-0000-000000000001'$$, 'A delete of B account is a silent no-op');
select lives_ok($$delete from public.transactions where id = 'd0d0d0d0-0000-0000-0000-00000000000b'$$, 'A delete of B transaction is a silent no-op');
select lives_ok($$delete from public.categories where id = 'c0c0c0c0-0000-0000-0000-00000000000b'$$, 'A delete of B category is a silent no-op');

select throws_ok($$update public.accounts set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'a1a1a1a1-0000-0000-0000-000000000001'$$,
  '42501', null, 'A cannot hand own account to B');
select lives_ok($$update public.categories set name_en = 'hacked' where is_default$$, 'A update of default categories is a no-op');
select lives_ok($$delete from public.categories where is_default$$, 'A delete of default categories is a no-op');

select throws_ok($$update public.profiles set last_active_at = now()$$, '42501', null, 'A cannot write last_active_at');
select throws_ok($$update public.profiles set away_until = now() + interval '1 day'$$, '42501', null, 'A cannot write away_until');
select lives_ok($$update public.profiles set language = 'dv'$$, 'A can update own language');
select throws_ok($$insert into public.profiles (user_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'A cannot insert a profile');
select throws_ok($$delete from public.profiles$$, '42501', null, 'A cannot delete a profile');

select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 100, 'income', '2026-11-01'
  from public.categories where name_en = 'Groceries'$$,
  '23514', null, 'transaction kind must match category kind');
select throws_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, -100, 'expense', '2026-11-01'
  from public.categories where name_en = 'Groceries'$$,
  '23514', null, 'amount_laari must be positive');
select lives_ok($$insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 100, 'expense', '2026-11-01'
  from public.categories where name_en = 'Groceries'$$,
  'A can insert a valid own transaction');

-- ------------------------------------------------------------------ as anon
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

select throws_ok('select * from public.profiles',     '42501', null, 'anon cannot read profiles');
select throws_ok('select * from public.accounts',     '42501', null, 'anon cannot read accounts');
select throws_ok('select * from public.categories',   '42501', null, 'anon cannot read categories');
select throws_ok('select * from public.transactions', '42501', null, 'anon cannot read transactions');

-- --------------------------------------------- B data untouched (as owner)
reset role;
select is((select name from public.accounts where id = 'b1b1b1b1-0000-0000-0000-000000000001'), 'B account', 'B account unchanged by A');
select is((select count(*) from public.transactions where id = 'd0d0d0d0-0000-0000-0000-00000000000b' and amount_laari = 99900), 1::bigint, 'B transaction unchanged by A');
select is((select count(*) from public.categories where id = 'c0c0c0c0-0000-0000-0000-00000000000b' and name_en = 'B custom'), 1::bigint, 'B category unchanged by A');
select is((select language from public.profiles where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'en', 'B profile unchanged by A');

-- ------------------------------------------------------------------ as user B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select is((select count(*) from public.accounts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot read A accounts');
select is((select count(*) from public.transactions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot read A transactions');
select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot read A profile');

select * from finish();
rollback;
