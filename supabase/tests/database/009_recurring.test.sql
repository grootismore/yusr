-- Migration 013: recurring expenses and income.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());
insert into public.recurring_items (user_id, kind, name, amount_minor) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'expense', 'B rent', 100000);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.recurring_items), 0::bigint, 'A cannot see B''s recurring items');
select lives_ok($$insert into public.recurring_items (id, user_id, kind, name, amount_minor, every, starts_on) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'income', 'Flat rent', 800000, 'month', '2026-11-05')$$, 'A can add a recurring income');
select throws_ok($$insert into public.recurring_items (user_id, kind, name, amount_minor) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'expense', 'x', 100)$$, '42501', null, 'A cannot add one for B');
select throws_ok($$insert into public.recurring_items (user_id, kind, name, amount_minor, every) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'x', 100, 'day')$$, '23514', null, 'only weekly, monthly or yearly');
select throws_ok($$insert into public.recurring_items (user_id, kind, name, amount_minor, category_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'income', 'x', 100, (select id from public.categories limit 1))$$, '23514', null, 'only an expense has a category');

-- One run per item per date; deleting the income keeps the date consumed.
insert into public.income (id, user_id, amount_laari, currency, fx_rate_to_mvr, received_at) values ('21111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 800000, 'MVR', 1, '2026-11-05');
select lives_ok($$insert into public.recurring_runs (user_id, recurring_id, occurrence, income_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2026-11-05', '21111111-1111-1111-1111-111111111111')$$, 'a date can be recorded');
select throws_ok($$insert into public.recurring_runs (user_id, recurring_id, occurrence, skipped) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2026-11-05', true)$$, '23505', null, 'the same date cannot be recorded twice');
select lives_ok($$delete from public.income where id = '21111111-1111-1111-1111-111111111111'$$, 'the income can be deleted');
select is((select count(*) from public.recurring_runs where occurrence = '2026-11-05' and income_id is null), 1::bigint, 'the date stays consumed after the income is deleted');
insert into public.income (id, user_id, amount_laari, currency, fx_rate_to_mvr, received_at) values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'MVR', 1, '2026-12-05');
select throws_ok($$insert into public.recurring_runs (user_id, recurring_id, occurrence, skipped, income_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2026-12-05', true, '22222222-2222-2222-2222-222222222222')$$, '23514', null, 'a skipped date records nothing');
reset role; set local role anon;
select throws_ok($$select * from public.recurring_items$$, '42501', null, 'signed-out users cannot read recurring items');

select * from finish();
rollback;
