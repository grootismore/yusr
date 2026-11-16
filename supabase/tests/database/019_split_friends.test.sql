-- Migration 023: Split groups shared with friends who have the app.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', '{}', '{}', now(), now());
set local role authenticated;

-- A keeps a group with two names, one of them a friend (Ahmed) who has the app.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claims', '{"email":"a@example.test"}', true);
insert into public.split_groups (id, user_id, name) values ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beach trip');
insert into public.split_people (id, user_id, group_id, name, is_me, account_id) values
  ('a2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Aisha', true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Ahmed', false, null);
insert into public.split_expenses (id, user_id, group_id, description, amount_minor, paid_by, spent_on) values ('a3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Dinner', 100000, 'a2222222-2222-2222-2222-222222222221', '2026-11-10');
select lives_ok($$insert into public.split_invites (group_id, person_id, email, invited_by) values ('a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'b@example.test', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, 'A invites Ahmed by email');
select throws_ok($$insert into public.split_invites (group_id, person_id, email, invited_by) values ('a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'B@Example.test', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '23514', null, 'an email is kept in lower case');

-- An outsider sees nothing and cannot join in.
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config('request.jwt.claims', '{"email":"c@example.test"}', true);
select is((select count(*) from public.split_groups) + (select count(*) from public.split_expenses) + (select count(*) from public.split_invites), 0::bigint, 'an outsider sees none of it');
select is((select count(*) from public.my_split_invites()), 0::bigint, 'and has no invitations');
select throws_ok($$insert into public.split_expenses (user_id, group_id, description, amount_minor, paid_by, spent_on) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'a1111111-1111-1111-1111-111111111111', 'x', 100, 'a2222222-2222-2222-2222-222222222221', '2026-11-10')$$, '42501', null, 'an outsider cannot add a cost');
select throws_ok($$select public.accept_split_invite((select i.id from public.split_invites i limit 1))$$, 'P0002', null, 'nor accept an invitation that is not for their email');

-- B signs in with the invited email and accepts.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claims', '{"email":"b@example.test"}', true);
select is((select count(*) from public.split_groups), 0::bigint, 'B sees no group before accepting');
select is((select group_name from public.my_split_invites()), 'Beach trip', 'B sees the invitation, with the group name');
select is((select invited_by_name from public.my_split_invites()), 'Aisha', 'and who asked');
select lives_ok($$select public.accept_split_invite((select invite_id from public.my_split_invites()))$$, 'B accepts');
select is((select count(*) from public.split_expenses), 1::bigint, 'B now sees the costs');
select lives_ok($$insert into public.split_expenses (user_id, group_id, description, amount_minor, paid_by, spent_on) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a1111111-1111-1111-1111-111111111111', 'Boat', 50000, 'a2222222-2222-2222-2222-222222222222', '2026-11-11')$$, 'and can add a cost');
select lives_ok($$update public.split_expenses set description = 'Dinner (fixed)' where id = 'a3333333-3333-3333-3333-333333333333'$$, 'and fix one A added');
select throws_ok($$update public.split_people set account_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' where id = 'a2222222-2222-2222-2222-222222222221'$$, '42501', null, 'B cannot link anyone to a person');
select throws_ok($$insert into public.split_people (user_id, group_id, name, account_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a1111111-1111-1111-1111-111111111111', 'Sneaky', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, '42501', null, 'or add a person already linked to someone else');
update public.split_groups set name = 'Renamed by B' where id = 'a1111111-1111-1111-1111-111111111111';
select is((select name from public.split_groups), 'Beach trip', 'only the owner can rename the group');

-- B leaves and sees nothing again.
select lives_ok($$select public.leave_split_group('a1111111-1111-1111-1111-111111111111')$$, 'B leaves');
select is((select count(*) from public.split_groups), 0::bigint, 'and no longer sees the group');

select * from finish();
rollback;
