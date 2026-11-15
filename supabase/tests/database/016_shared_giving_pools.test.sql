-- Migration 020: shared gifts and pool contributions go in the shared pot.
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
insert into public.giving_commitments (id, user_id, recipient, amount_laari, household_id) values ('f1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'School', 70000, current_setting('t.hid')::uuid);
insert into public.money_pools (id, user_id, name, amount_minor, household_id) values ('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Friends', 100000, current_setting('t.hid')::uuid);

-- A pays the gift into the shared pot.
insert into public.household_entries (id, household_id, user_id, kind, amount_laari, entry_date, merchant) values ('b1111111-1111-1111-1111-111111111111', current_setting('t.hid')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 70000, '2026-11-05', 'School');
select lives_ok($$insert into public.sadaqah_entries (user_id, household_entry_id, kind, recipient_note, commitment_id, period) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b1111111-1111-1111-1111-111111111111', 'sadaqah', 'School', 'f1111111-1111-1111-1111-111111111111', '2026-11-01')$$, 'A marks the gift paid, into the shared pot');
select throws_ok($$insert into public.sadaqah_entries (user_id, kind) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sadaqah')$$, '42501', null, 'a payment has to point at an expense or a shared entry');
select throws_ok($$insert into public.sadaqah_entries (user_id, household_entry_id, kind, commitment_id, period) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b1111111-1111-1111-1111-111111111111', 'sadaqah', 'f1111111-1111-1111-1111-111111111111', '2026-11-01')$$, '23505', null, 'the same entry cannot be a payment twice');

-- B sees it paid and sees the shared entry.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.sadaqah_entries), 1::bigint, 'B sees the gift as paid');
select is((select count(*) from public.household_entries), 1::bigint, 'and the shared entry with the amount');

-- B pays the pool the same way.
insert into public.household_entries (id, household_id, user_id, kind, amount_laari, entry_date, merchant) values ('b2222222-2222-2222-2222-222222222222', current_setting('t.hid')::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'expense', 100000, '2026-11-05', 'Friends');
select lives_ok($$insert into public.pool_payments (user_id, pool_id, household_entry_id, period) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'e1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', '2026-11-01')$$, 'B pays the shared pool');

-- Removing the shared entry takes the payment marker with it.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select count(*) from public.pool_payments), 1::bigint, 'A sees the pool month as paid');
select lives_ok($$delete from public.household_entries where id = 'b2222222-2222-2222-2222-222222222222'$$, 'the pool payment is taken back');
select is((select count(*) from public.pool_payments), 0::bigint, 'and the month is unpaid again');

select * from finish();
rollback;
