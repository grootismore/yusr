-- The optional start date of a debt (migration 010): the owner can set and clear it, and nobody
-- else can read or change it.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());

insert into public.debts (id, user_id, lender, kind, original_laari, balance_laari, started_on) values
  ('d1d1d1d1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A lender', 'bank', 1000000, 800000, '2025-03-01'),
  ('d1d1d1d1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B lender', 'bank', 500000, 500000, '2024-06-15');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select started_on from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000a'), '2025-03-01'::date, 'A reads own start date');
select is((select count(*) from public.debts where started_on = '2024-06-15'), 0::bigint, 'A cannot see the start date of B''s debt');

select lives_ok($$update public.debts set started_on = '2025-04-02' where id = 'd1d1d1d1-0000-0000-0000-00000000000a'$$, 'A changes own start date');
select is((select started_on from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000a'), '2025-04-02'::date, 'the new date is stored');
select lives_ok($$update public.debts set started_on = null where id = 'd1d1d1d1-0000-0000-0000-00000000000a'$$, 'A clears the start date');
select is((select started_on from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000a'), null, 'a debt can have no start date');
select lives_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari, started_on)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New lender', 'person', 100, 100, '2026-01-10')$$, 'A adds a debt with a start date');
select throws_ok($$insert into public.debts (user_id, lender, kind, original_laari, balance_laari, started_on)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'bank', 1, 1, '2026-01-10')$$, '42501', null, 'A cannot add a debt for B');

select lives_ok($$update public.debts set started_on = '2000-01-01' where id = 'd1d1d1d1-0000-0000-0000-00000000000b'$$, 'A update of B debt is a no-op');
reset role;
select is((select started_on from public.debts where id = 'd1d1d1d1-0000-0000-0000-00000000000b'), '2024-06-15'::date, 'B''s start date is untouched');

select * from finish();
rollback;
