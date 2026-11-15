-- Migration 012: salary-deducted debts and money pools.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
insert into public.money_pools (user_id, name, amount_minor) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B pool', 100000);

select is((select count(*) from public.categories where slug = 'money-pool' and user_id is null), 1::bigint, 'the Money pool category exists once');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.money_pools), 0::bigint, 'A cannot see B''s pools');
select lives_ok($$insert into public.money_pools (id, user_id, name, amount_minor, members, payout_month) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Office pool', 100000, 10, '2027-03-01')$$, 'A can add a pool');
select throws_ok($$insert into public.money_pools (user_id, name, amount_minor) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 100)$$, '42501', null, 'A cannot add a pool for B');
select throws_ok($$insert into public.money_pools (user_id, name, amount_minor, payout_month) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 100, '2027-03-15')$$, '23514', null, 'the payout month must be the first of a month');

-- One contribution per pool per month.
insert into public.expenses (id, user_id, amount_laari, currency, fx_rate_to_mvr, spent_at, source) values
  ('21111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100000, 'MVR', 1, '2026-11-01', 'manual'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100000, 'MVR', 1, '2026-11-02', 'manual');
select lives_ok($$insert into public.pool_payments (user_id, pool_id, expense_id, period) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2026-11-01')$$, 'a month can be paid');
select throws_ok($$insert into public.pool_payments (user_id, pool_id, expense_id, period) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2026-11-01')$$, '23505', null, 'the same month cannot be paid twice');

-- Instalments taken out of salary are recorded once a month.
insert into public.debts (id, user_id, lender, kind, opening_balance_laari, min_payment_laari, auto_deducted) values
  ('31111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MIB loan', 'loan', 1200000, 100000, true);
select lives_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on, source, period) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '31111111-1111-1111-1111-111111111111', 100000, '2026-11-01', 'auto', '2026-11-01')$$, 'an automatic instalment is recorded');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on, source, period) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '31111111-1111-1111-1111-111111111111', 100000, '2026-11-01', 'auto', '2026-11-01')$$, '23505', null, 'the same month cannot be recorded twice');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on, source) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '31111111-1111-1111-1111-111111111111', 100000, '2026-12-01', 'auto')$$, '23514', null, 'an automatic instalment must say which month it is for');

select * from finish();
rollback;
