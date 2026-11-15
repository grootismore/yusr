-- Migration 021: Kharadhu Plus and the free limits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());
-- B is on Plus.
insert into public.entitlements (user_id, plan, source) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'plus', 'manual');
select is(public.scan_limit('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 10, 'a free user gets 10 scans a month');
select is(public.scan_limit('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 100, 'Plus gets 100');
insert into public.entitlements (user_id, plan, expires_at) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'plus', now() - interval '1 day');
select is(public.is_plus('cccccccc-cccc-cccc-cccc-cccccccccccc'), false, 'an expired Plus is free again');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok($$insert into public.entitlements (user_id, plan) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'plus')$$, '42501', null, 'nobody gives themselves Plus');
select is((select count(*) from public.entitlements), 0::bigint, 'and sees only their own row (none)');

-- Recurring: six active are free, the seventh needs Plus.
insert into public.recurring_items (user_id, kind, name, amount_minor, every, starts_on)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Bill ' || g, 100, 'month', '2026-11-01' from generate_series(1, 6) g;
select throws_ok($$insert into public.recurring_items (user_id, kind, name, amount_minor, every, starts_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Seventh', 100, 'month', '2026-11-01')$$, 'P0001', 'plus_required:recurring', 'the seventh recurring item needs Plus');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
insert into public.recurring_items (user_id, kind, name, amount_minor, every, starts_on)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'expense', 'Bill ' || g, 100, 'month', '2026-11-01' from generate_series(1, 7) g;
select is((select count(*) from public.recurring_items), 7::bigint, 'Plus can have more');

-- Split: two groups are free, the third needs Plus.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
insert into public.split_groups (user_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'One'), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Two');
select throws_ok($$insert into public.split_groups (user_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Three')$$, 'P0001', 'plus_required:split', 'the third Split group needs Plus');

-- Household: two people free, a third needs the owner on Plus.
select set_config('t.hid', public.create_household('Us', 'Aisha')::text, true) is not null as made;
select set_config('t.code', public.create_household_invite(), true) is not null as invited;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok($$select public.join_household(current_setting('t.code'), 'Second')$$, 'the second person joins free');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('t.code2', public.create_household_invite(), true) is not null as invited2;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok($$select public.join_household(current_setting('t.code2'), 'Third')$$, 'P0001', 'plus_required:household', 'a third person needs the owner on Plus');

select * from finish();
rollback;
