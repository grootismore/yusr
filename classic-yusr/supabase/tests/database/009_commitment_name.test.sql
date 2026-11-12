-- The optional name of a Sadaqat plan (migration 009): the owner can set and clear it, it has a
-- length limit, and nobody else can read or change it.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());

insert into public.commitments (id, user_id, type, amount_laari, schedule, name) values
  ('c1c1c1c1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sadaqah', 5000, 'weekly_friday', 'A plan'),
  ('c1c1c1c1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'zakat', 90000, 'ramadan', 'B secret name');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select name from public.commitments where id = 'c1c1c1c1-0000-0000-0000-00000000000a'), 'A plan', 'A reads own plan name');
select is((select count(*) from public.commitments where name = 'B secret name'), 0::bigint, 'A cannot see the name of B''s plan');

select lives_ok($$update public.commitments set name = 'Renamed' where id = 'c1c1c1c1-0000-0000-0000-00000000000a'$$, 'A renames own plan');
select is((select name from public.commitments where id = 'c1c1c1c1-0000-0000-0000-00000000000a'), 'Renamed', 'the new name is stored');
select lives_ok($$update public.commitments set name = null where id = 'c1c1c1c1-0000-0000-0000-00000000000a'$$, 'A clears the name');
select is((select name from public.commitments where id = 'c1c1c1c1-0000-0000-0000-00000000000a'), null, 'a plan can have no name');

select throws_ok($$update public.commitments set name = '' where id = 'c1c1c1c1-0000-0000-0000-00000000000a'$$, '23514', null, 'an empty name is refused (use null)');
select throws_ok($$update public.commitments set name = repeat('x', 101) where id = 'c1c1c1c1-0000-0000-0000-00000000000a'$$, '23514', null, 'a name over 100 characters is refused');
select lives_ok($$update public.commitments set name = repeat('x', 100) where id = 'c1c1c1c1-0000-0000-0000-00000000000a'$$, 'exactly 100 characters is fine');

select lives_ok($$update public.commitments set name = 'hacked' where id = 'c1c1c1c1-0000-0000-0000-00000000000b'$$, 'A update of B plan is a no-op');
reset role;
select is((select name from public.commitments where id = 'c1c1c1c1-0000-0000-0000-00000000000b'), 'B secret name', 'B''s name is untouched');

select * from finish();
rollback;
