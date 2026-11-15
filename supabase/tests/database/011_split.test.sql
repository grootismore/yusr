-- Migration 015: Split groups.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
insert into public.split_groups (id, user_id, name) values ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B trip');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.split_groups), 0::bigint, 'A cannot see B''s groups');
select lives_ok($$insert into public.split_groups (id, user_id, name) values ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beach trip')$$, 'A makes a group');
select throws_ok($$insert into public.split_groups (user_id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x')$$, '42501', null, 'A cannot make a group for B');
select lives_ok($$insert into public.split_people (id, user_id, group_id, name, is_me) values
  ('a2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Me', true),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Ahmed', false)$$, 'A adds people');
select throws_ok($$insert into public.split_people (user_id, group_id, name, is_me) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Second me', true)$$, '23505', null, 'only one person per group is me');
select throws_ok($$insert into public.split_people (user_id, group_id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b1111111-1111-1111-1111-111111111111', 'Sneaky')$$, '42501', null, 'a person cannot be added to someone else''s group');

select lives_ok($$insert into public.split_expenses (id, user_id, group_id, description, amount_minor, paid_by, spent_on) values ('a3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'Dinner', 100000, 'a2222222-2222-2222-2222-222222222221', '2026-11-10')$$, 'A records who paid');
select lives_ok($$insert into public.split_shares (expense_id, person_id, group_id, user_id, share_minor) values
  ('a3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222221', 'a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50000),
  ('a3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50000)$$, 'and the shares');
select throws_ok($$insert into public.split_expenses (user_id, group_id, description, amount_minor, paid_by, spent_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'x', 100, 'b2222222-2222-2222-2222-222222222222', '2026-11-10')$$, '23503', null, 'an expense must be paid by someone in the same group');
select throws_ok($$insert into public.split_settlements (user_id, group_id, from_person, to_person, amount_minor, settled_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 100, '2026-11-11')$$, '23514', null, 'nobody pays themselves back');
select lives_ok($$insert into public.split_settlements (user_id, group_id, from_person, to_person, amount_minor, settled_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222221', 50000, '2026-11-11')$$, 'a settlement is recorded');
select lives_ok($$delete from public.split_groups where id = 'a1111111-1111-1111-1111-111111111111'$$, 'deleting a group takes its people, expenses, shares and settlements with it');
reset role; set local role anon;
select throws_ok($$select * from public.split_groups$$, '42501', null, 'signed-out users cannot read groups');

select * from finish();
rollback;
