-- Migration 019: recurring items shared with the household.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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
insert into public.recurring_items (id, user_id, kind, name, amount_minor, every, starts_on, household_id, for_user) values
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Flat rent', 1200000, 'month', '2026-11-01', current_setting('t.hid')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Private gym', 50000, 'month', '2026-11-01', null, null);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.recurring_items), 1::bigint, 'B sees only the shared item');
select lives_ok($$insert into public.household_entries (id, household_id, user_id, kind, amount_laari, entry_date, merchant) values ('e1111111-1111-1111-1111-111111111111', current_setting('t.hid')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 1200000, '2026-11-01', 'Flat rent')$$, 'B records the rent into the shared pot, for Areesh');
select lives_ok($$insert into public.recurring_runs (user_id, recurring_id, occurrence, household_entry_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a1111111-1111-1111-1111-111111111111', '2026-11-01', 'e1111111-1111-1111-1111-111111111111')$$, 'and marks the date done');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select count(*) from public.recurring_runs), 1::bigint, 'A sees the date as done');
select throws_ok($$insert into public.recurring_runs (user_id, recurring_id, occurrence) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', '2026-11-01')$$, '23505', null, 'the same date cannot be recorded twice');
select throws_ok($$insert into public.recurring_runs (user_id, recurring_id, occurrence, skipped, household_entry_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', '2026-12-01', true, 'e1111111-1111-1111-1111-111111111111')$$, '23514', null, 'a skipped date records nothing');
select lives_ok($$delete from public.household_entries where id = 'e1111111-1111-1111-1111-111111111111'$$, 'deleting the entry (the rent was not paid)');
select is((select count(*) from public.recurring_runs), 1::bigint, 'keeps the date done, so it is not recorded again');

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.recurring_items) + (select count(*) from public.recurring_runs), 0::bigint, 'an outsider sees nothing');
select throws_ok($$insert into public.recurring_items (user_id, kind, name, amount_minor, every, starts_on, household_id) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'expense', 'x', 100, 'month', '2026-11-01', current_setting('t.hid')::uuid)$$, '42501', null, 'and cannot attach one to the household');

select * from finish();
rollback;
