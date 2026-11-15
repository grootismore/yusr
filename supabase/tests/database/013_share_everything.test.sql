-- Migration 017: debts, pools and giving shared with the household.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('t.hid', public.create_household('Us', 'Aisha')::text, true) is not null as made;
select set_config('t.code', public.create_household_invite(), true) is not null as invited;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select public.join_household(current_setting('t.code'), 'Ahmed');

-- A shares a debt, a pool and a commitment, and keeps one debt private.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
insert into public.debts (id, user_id, lender, kind, opening_balance_laari, min_payment_laari, household_id)
  values ('d1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MIB', 'loan', 100000, 5000, current_setting('t.hid')::uuid),
         ('d2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Private', 'loan', 100000, 5000, null);
insert into public.money_pools (id, user_id, name, amount_minor, household_id) values ('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Friends', 100000, current_setting('t.hid')::uuid);
insert into public.giving_commitments (id, user_id, recipient, amount_laari, household_id) values ('f1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'School', 70000, current_setting('t.hid')::uuid);

-- B sees the shared ones only, and can pay and edit them.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.debts), 1::bigint, 'B sees the shared debt but not the private one');
select lives_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd1111111-1111-1111-1111-111111111111', 5000, '2026-11-10')$$, 'B pays the shared debt');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd2222222-2222-2222-2222-222222222222', 5000, '2026-11-10')$$, '42501', null, 'B cannot pay A''s private debt');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd1111111-1111-1111-1111-111111111111', 5000, '2026-11-10')$$, '42501', null, 'a payment is recorded as the person who made it');
select lives_ok($$update public.debts set min_payment_laari = 6000 where id = 'd1111111-1111-1111-1111-111111111111'$$, 'B edits the shared debt');
select throws_ok($$update public.debts set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'd1111111-1111-1111-1111-111111111111'$$, '42501', null, 'nobody takes over the owner');
select is((select count(*) from public.money_pools), 1::bigint, 'B sees the shared pool');
select is((select count(*) from public.giving_commitments), 1::bigint, 'and the shared commitment');

-- A sees B's payment on the balance.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select paid_laari from public.debt_balances where id = 'd1111111-1111-1111-1111-111111111111'), 5000::bigint, 'A sees what B paid');

-- C, outside the household, sees nothing and cannot attach to it.
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.debts) + (select count(*) from public.money_pools) + (select count(*) from public.giving_commitments), 0::bigint, 'an outsider sees none of it');
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, min_payment_laari, household_id) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'x', 'loan', 100, 10, current_setting('t.hid')::uuid)$$, '42501', null, 'C cannot put a debt into a household they are not in');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'd1111111-1111-1111-1111-111111111111', 100, '2026-11-10')$$, '42501', null, 'C cannot pay it');

-- Un-sharing hides it from B again.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$update public.debts set household_id = null where id = 'd1111111-1111-1111-1111-111111111111'$$, 'A makes it private again');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.debts), 0::bigint, 'and B no longer sees it');

select * from finish();
rollback;
