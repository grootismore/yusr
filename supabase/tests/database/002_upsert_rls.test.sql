-- The offline queue writes with INSERT ... ON CONFLICT (id) DO UPDATE.
-- User B must not be able to hijack user A's rows by reusing their ids.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());

insert into public.accounts (id, user_id, name, type) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A account', 'cash');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select throws_ok($$insert into public.accounts (id, user_id, name, type)
  values ('a1a1a1a1-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stolen', 'cash')
  on conflict (id) do update set name = excluded.name, user_id = excluded.user_id$$,
  '42501', null, 'B cannot upsert over A account by reusing its id');

select throws_ok($$insert into public.accounts (id, user_id, name, type)
  values ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stolen', 'cash')
  on conflict (id) do update set name = excluded.name$$,
  '42501', null, 'B cannot upsert as A over A account');

select throws_ok($$insert into public.accounts (id, user_id, name, type)
  values (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'cash')
  on conflict (id) do nothing$$,
  '42501', null, 'B cannot insert an account owned by A via upsert');

-- Upserting own row twice is idempotent.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select lives_ok($$insert into public.accounts (id, user_id, name, type)
  values ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A renamed', 'cash')
  on conflict (id) do update set name = excluded.name$$, 'A can upsert own row');
select lives_ok($$insert into public.accounts (id, user_id, name, type)
  values ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A renamed', 'cash')
  on conflict (id) do update set name = excluded.name$$, 'replaying the same upsert is harmless');

reset role;
select is((select name from public.accounts where id = 'a1a1a1a1-0000-0000-0000-000000000001'), 'A renamed',
  'A account holds the last write and was never changed by B');

select * from finish();
rollback;
