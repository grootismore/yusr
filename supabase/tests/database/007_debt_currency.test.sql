-- Migration 011: foreign-currency debts and percentage minimums.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select lives_ok($$insert into public.debts (id, user_id, lender, kind, opening_balance_laari, currency, min_pct_bps, min_payment_laari, interest_bearing, interest_rate_bps)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BML Visa', 'credit_card', 60000, 'USD', 500, 10000, true, 2400)$$, 'a USD card with a 5% minimum and a floor');
select is((select currency from public.debts where lender = 'BML Visa'), 'USD', 'the currency is kept');
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, currency) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'loan', 100, 'usd')$$, '23514', null, 'a currency is three capital letters');
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, min_pct_bps) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'loan', 100, 20000)$$, '23514', null, 'a percentage minimum cannot pass 100%');
select lives_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on, paid_mvr_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 6485, '2026-11-10', 100000)$$, 'a payment records the MVR paid');
select is((select balance_laari from public.debt_balances where id = '11111111-1111-1111-1111-111111111111'), 53515::bigint, 'the balance falls by the USD value, not the MVR paid');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on, paid_mvr_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 100, '2026-11-10', 0)$$, '23514', null, 'MVR paid must be positive');

select * from finish();
rollback;
