-- Migration 018: shared items tied to a person.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('t.hid', public.create_household('Us', 'Areesh')::text, true) is not null as made;
select set_config('t.code', public.create_household_invite(), true) is not null as invited;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select public.join_household(current_setting('t.code'), 'Nanns');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$insert into public.debts (id, user_id, lender, kind, opening_balance_laari, min_payment_laari, household_id, for_user)
  values ('d1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MIB', 'loan', 100000, 5000, current_setting('t.hid')::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, 'A records a loan that is Nanns''s');
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, min_payment_laari, household_id, for_user)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'loan', 100, 10, current_setting('t.hid')::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, '23514', null, 'it cannot be tied to someone outside the household');
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, min_payment_laari, for_user)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'loan', 100, 10, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, '23514', null, 'a private debt cannot be tied to someone else');

-- A records a bill that Nanns paid, and a salary for Nanns.
select lives_ok($$insert into public.household_entries (household_id, user_id, kind, amount_laari, entry_date) values (current_setting('t.hid')::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'expense', 450000, '2026-11-04')$$, 'A records a bill Nanns paid');
select lives_ok($$insert into public.household_entries (household_id, user_id, kind, amount_laari, entry_date) values (current_setting('t.hid')::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'income', 1800000, '2026-11-01')$$, 'and Nanns''s salary');
select throws_ok($$insert into public.household_entries (household_id, user_id, kind, amount_laari, entry_date) values (current_setting('t.hid')::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'expense', 100, '2026-11-04')$$, '42501', null, 'not for someone outside the household');

-- Nanns leaves: what was tied to them becomes everyone's.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select for_user from public.debts where id = 'd1111111-1111-1111-1111-111111111111'), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'B sees the loan is theirs');
select lives_ok($$delete from public.household_members where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$, 'B leaves');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select for_user from public.debts where id = 'd1111111-1111-1111-1111-111111111111'), null, 'the loan is no longer tied to them');

select * from finish();
rollback;
