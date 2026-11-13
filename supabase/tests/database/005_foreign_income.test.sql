-- Migration 009: kept-in-currency income and exchange records.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
insert into public.conversions (user_id, currency, amount_minor, mvr_laari, converted_at) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'USD', 10000, 154200, '2026-11-20');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.conversions), 0::bigint, 'A cannot see B''s exchanges');
select lives_ok($$insert into public.income (user_id, amount_laari, currency, fx_rate_to_mvr, received_at, keep_in_currency) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50000, 'USD', 15.42, '2026-11-01', true)$$, 'USD income can be kept in USD');
select is((select mvr_laari from public.income where keep_in_currency), 771000::bigint, 'the MVR value on payday is still worked out');
select throws_ok($$insert into public.income (user_id, amount_laari, currency, fx_rate_to_mvr, received_at, keep_in_currency) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 800000, 'MVR', 1, '2026-11-01', true)$$, '23514', null, 'MVR income cannot be "kept in a currency"');
select lives_ok($$insert into public.conversions (user_id, currency, amount_minor, mvr_laari, converted_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'USD', 20000, 308000, '2026-11-20')$$, 'A can record an exchange');
select throws_ok($$insert into public.conversions (user_id, currency, amount_minor, mvr_laari, converted_at) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'USD', 100, 1500, '2026-11-20')$$, '42501', null, 'A cannot record an exchange for B');
select throws_ok($$insert into public.conversions (user_id, currency, amount_minor, mvr_laari, converted_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MVR', 100, 100, '2026-11-20')$$, '23514', null, 'MVR cannot be exchanged to MVR');
select throws_ok($$insert into public.conversions (user_id, currency, amount_minor, mvr_laari, converted_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'USD', 0, 100, '2026-11-20')$$, '23514', null, 'an exchange needs a positive amount');
select lives_ok($$delete from public.conversions$$, 'A can delete their own exchange record');
reset role; set local role anon;
select throws_ok($$select * from public.conversions$$, '42501', null, 'signed-out users cannot read exchanges');

select * from finish();
rollback;
