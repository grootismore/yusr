-- Migration 010: monthly giving commitments.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
insert into public.giving_commitments (user_id, recipient, amount_laari) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Someone', 10000);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.giving_commitments), 0::bigint, 'A cannot see B''s commitments');
select lives_ok($$insert into public.giving_commitments (user_id, recipient, note, amount_laari, due_day) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alooka School', 'sponsorship of Lama', 70000, 5)$$, 'A can add a monthly commitment');
select throws_ok($$insert into public.giving_commitments (user_id, recipient, amount_laari) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 100)$$, '42501', null, 'A cannot add one for B');
select throws_ok($$insert into public.giving_commitments (user_id, recipient, amount_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 0)$$, '23514', null, 'an amount must be positive');
select throws_ok($$insert into public.giving_commitments (user_id, recipient, amount_laari, due_day) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 100, 31)$$, '23514', null, 'the due day must exist in every month');
select lives_ok($$update public.giving_commitments set ended_on = current_date where recipient = 'Alooka School'$$, 'A can end a commitment');

-- One payment per commitment per month.
insert into public.expenses (id, user_id, amount_laari, currency, fx_rate_to_mvr, spent_at, source) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 70000, 'MVR', 1, '2026-11-05', 'manual'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 70000, 'MVR', 1, '2026-11-06', 'manual');
select lives_ok($$insert into public.sadaqah_entries (user_id, expense_id, kind, commitment_id, period)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'sadaqah', id, '2026-11-01' from public.giving_commitments where recipient = 'Alooka School'$$, 'a month can be marked paid');
select throws_ok($$insert into public.sadaqah_entries (user_id, expense_id, kind, commitment_id, period)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'sadaqah', id, '2026-11-01' from public.giving_commitments where recipient = 'Alooka School'$$, '23505', null, 'the same month cannot be paid twice');
reset role; set local role anon;
select throws_ok($$select * from public.giving_commitments$$, '42501', null, 'signed-out users cannot read commitments');

select * from finish();
rollback;
