-- Migration 016: couple or household.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select public.create_household('Us', 'Aisha');
select is((select mode from public.households), 'household', 'a new household starts as a household');
select lives_ok($$update public.households set mode = 'couple'$$, 'the owner makes it a couple');
select is((select mode from public.households), 'couple', 'and it sticks');
select set_config('t.code', public.create_household_invite(), true) is not null as invited;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok($$select public.join_household(current_setting('t.code'), 'Ahmed')$$, 'the partner joins');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('t.code2', public.create_household_invite(), true) is not null as invited2;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.join_household(current_setting('t.code2'), 'Third')$$, '23514', null, 'a third person cannot join a couple');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok($$update public.households set name = 'Mine now'$$, '42501', null, 'nobody changes the name or anything else but the mode');
select * from finish();
rollback;
