-- Migration 014: households and the shared pot.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());

set local role authenticated;

-- A starts a household.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('t.hid', public.create_household('Home', 'Aisha')::text, true) is not null as made;
select throws_ok($$select public.create_household('Second', 'Aisha')$$, '23505', null, 'a person is in one household at most');
select is((select count(*) from public.household_members), 1::bigint, 'A is the only member');
select is((select role from public.household_members), 'owner', 'the creator is the owner');
select set_config('t.code', public.create_household_invite(), true) is not null as invited;
select throws_ok($$select * from public.household_invites$$, '42501', null, 'invites cannot be read by the app, only the functions touch them');
select throws_ok($$insert into public.household_members (household_id, user_id, display_name) values (current_setting('t.hid')::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sneaky')$$, '42501', null, 'nobody can add a member by writing the table');

-- B joins with the code; wrong and reused codes fail.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok($$select public.join_household('NOPE00000000', 'Ahmed')$$, 'P0002', null, 'a wrong code is refused');
select lives_ok($$select public.join_household(current_setting('t.code'), 'Ahmed')$$, 'B joins with the code');
select is((select count(*) from public.household_members), 2::bigint, 'B sees both members');

-- C cannot reuse it, and sees nothing.
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.join_household(current_setting('t.code'), 'Cara')$$, 'P0002', null, 'a used code cannot be used again');
select is((select count(*) from public.households), 0::bigint, 'an outsider sees no household');

-- The shared pot: members share it, outsiders cannot touch it.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$insert into public.household_entries (id, household_id, user_id, kind, amount_laari, entry_date, merchant) values ('11111111-1111-1111-1111-111111111111', current_setting('t.hid')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 250000, '2026-11-10', 'Groceries')$$, 'A adds a shared expense');
select throws_ok($$insert into public.household_entries (household_id, user_id, kind, amount_laari, entry_date) values (current_setting('t.hid')::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'expense', 100, '2026-11-10')$$, '42501', null, 'A cannot add an entry in B''s name');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.household_entries), 1::bigint, 'B sees A''s shared expense');
select lives_ok($$update public.household_entries set amount_laari = 260000 where id = '11111111-1111-1111-1111-111111111111'$$, 'B can correct a shared entry');
select throws_ok($$select public.remove_household_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'only the owner can remove someone');
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$insert into public.household_entries (household_id, user_id, kind, amount_laari, entry_date) values (current_setting('t.hid')::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'expense', 100, '2026-11-10')$$, '42501', null, 'an outsider cannot add to the shared pot');
select is((select count(*) from public.household_entries), 0::bigint, 'an outsider cannot read the shared pot');

-- Leaving: the other member becomes owner, and the household goes when the last one leaves.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$select public.leave_household()$$, 'the owner leaves');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select role from public.household_members where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'owner', 'B becomes the owner');
select lives_ok($$select public.leave_household()$$, 'B leaves too');
reset role;
select is((select count(*) from public.households), 0::bigint, 'the empty household is removed, with its shared pot');

select * from finish();
rollback;
