-- RLS, grant and storage tests for migrations 001-003.
-- A user must never read or write another user's rows or receipt files, and nobody but the
-- scan-receipt function (service role) may change scan_usage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

-- ------------------------------------------------------------------ fixtures
-- Runs as the test owner (bypasses RLS). Fixed IDs keep assertions readable.
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '{}', '{}', now(), now());

insert into public.categories (id, user_id, name_en, name_dv) values
  ('c0c0c0c0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A custom', 'A custom'),
  ('c0c0c0c0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B custom', 'B custom');

insert into public.receipts (id, user_id, image_path) values
  ('e0e0e0e0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/r1.jpg'),
  ('e0e0e0e0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/r1.jpg');
insert into public.receipt_items (receipt_id, user_id, name, total_laari) values
  ('e0e0e0e0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A item', 1000),
  ('e0e0e0e0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B item', 2000);

insert into public.expenses (id, user_id, amount_laari, spent_at) values
  ('d0d0d0d0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12500, '2026-11-01'),
  ('d0d0d0d0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 99900, '2026-11-01');
insert into public.income (user_id, amount_laari, received_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 500000, '2026-11-01'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 900000, '2026-11-01');
insert into public.budgets (user_id, month, limit_laari) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-01', 300000),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-11-01', 700000);
insert into public.scan_usage (user_id, month, scans_used) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-01', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-11-01', 7);
insert into storage.objects (bucket_id, name) values
  ('receipts', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/r1.jpg'),
  ('receipts', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/r1.jpg');

select is((select count(*) from public.profiles), 2::bigint, 'a profile is created automatically for each new user');
select is((select count(*) from public.categories where user_id is null), 10::bigint, 'ten default categories are seeded');
select is((select public from storage.buckets where id = 'receipts'), false, 'the receipts bucket is private');

-- ------------------------------------------------------------------ as user A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.profiles), 1::bigint, 'A sees only their own profile');
select is((select count(*) from public.expenses), 1::bigint, 'A sees only their own expenses');
select is((select count(*) from public.income), 1::bigint, 'A sees only their own income');
select is((select count(*) from public.budgets), 1::bigint, 'A sees only their own budgets');
select is((select count(*) from public.receipts), 1::bigint, 'A sees only their own receipts');
select is((select count(*) from public.receipt_items), 1::bigint, 'A sees only their own receipt items');
select is((select count(*) from public.categories), 11::bigint, 'A sees the 10 defaults plus their own category, not B''s');
select is((select count(*) from public.scan_usage), 1::bigint, 'A sees only their own scan_usage');

select throws_ok($$insert into public.expenses (user_id, amount_laari, spent_at) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 100, '2026-11-02')$$,
  '42501', null, 'A cannot insert an expense for B');
select throws_ok($$insert into public.income (user_id, amount_laari, received_at) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 100, '2026-11-02')$$,
  '42501', null, 'A cannot insert income for B');
select throws_ok($$insert into public.budgets (user_id, month, limit_laari) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-12-01', 100)$$,
  '42501', null, 'A cannot insert a budget for B');
select throws_ok($$insert into public.receipts (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  '42501', null, 'A cannot insert a receipt for B');
select throws_ok($$insert into public.expenses (user_id, amount_laari, spent_at, category_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, '2026-11-02', 'c0c0c0c0-0000-0000-0000-00000000000b')$$,
  '42501', null, 'A cannot file an expense under B''s category');
select throws_ok($$insert into public.expenses (user_id, amount_laari, spent_at, receipt_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, '2026-11-02', 'e0e0e0e0-0000-0000-0000-00000000000b')$$,
  '42501', null, 'A cannot attach B''s receipt to an expense');
select throws_ok($$insert into public.receipt_items (receipt_id, user_id, name, total_laari) values ('e0e0e0e0-0000-0000-0000-00000000000b', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 1)$$,
  '42501', null, 'A cannot add items to B''s receipt');
select throws_ok($$insert into public.budgets (user_id, month, limit_laari, category_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01', 100, 'c0c0c0c0-0000-0000-0000-00000000000b')$$,
  '42501', null, 'A cannot budget against B''s category');
select throws_ok($$insert into public.categories (user_id, slug, name_en, name_dv) values (null, 'hack', 'x', 'x')$$,
  '42501', null, 'A cannot create a default category');
select throws_ok($$insert into public.receipts (user_id, image_path) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x.jpg')$$,
  '23514', null, 'A cannot point a receipt at B''s image path');

-- Writes against rows A cannot see affect nothing (checked as the owner further down).
update public.expenses set amount_laari = 1 where id = 'd0d0d0d0-0000-0000-0000-00000000000b';
delete from public.expenses where id = 'd0d0d0d0-0000-0000-0000-00000000000b';
update public.categories set name_en = 'hacked' where user_id is null;
delete from public.categories where user_id is null;
update public.profiles set language = 'en' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
delete from storage.objects where name = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/r1.jpg';
select throws_ok($$update public.profiles set id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'A cannot rewrite their profile id');

-- A can still do their own work.
insert into public.expenses (id, user_id, amount_laari, currency, fx_rate_to_mvr, spent_at, category_id)
values ('d0d0d0d0-0000-0000-0000-0000000000a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10000, 'USD', 15.42, '2026-11-02', 'c0c0c0c0-0000-0000-0000-00000000000a');
select is((select mvr_laari from public.expenses where id = 'd0d0d0d0-0000-0000-0000-0000000000a2'),
  154200::bigint, 'A can add an expense in their own category; mvr_laari is derived from amount and rate');
select throws_ok($$insert into public.expenses (user_id, amount_laari, currency, fx_rate_to_mvr, spent_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 'MVR', 2, '2026-11-02')$$,
  '23514', null, 'an MVR expense must have rate 1');
select throws_ok($$insert into public.expenses (user_id, amount_laari, spent_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, '2026-11-02')$$,
  '23514', null, 'amounts must be positive');
select throws_ok($$insert into public.budgets (user_id, month, limit_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-01', 5)$$,
  '23505', null, 'only one overall budget per month');

-- scan_usage is read-only for clients
select throws_ok($$insert into public.scan_usage (user_id, month, scans_used) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01', 0)$$,
  '42501', null, 'A cannot insert scan_usage');
select throws_ok($$update public.scan_usage set scans_used = 0 where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'A cannot reset their own scan quota');
select throws_ok($$delete from public.scan_usage where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'A cannot delete their scan_usage');
select throws_ok($$select public.reserve_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-01', 10)$$,
  '42501', null, 'A cannot call reserve_scan');
select throws_ok($$select public.refund_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-11-01')$$,
  '42501', null, 'A cannot call refund_scan');

-- Storage: own prefix only
select is((select count(*) from storage.objects where bucket_id = 'receipts'), 1::bigint, 'A sees only their own receipt files');
insert into storage.objects (bucket_id, name) values ('receipts', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/r2.jpg');
select is((select count(*) from storage.objects where bucket_id = 'receipts'), 2::bigint, 'A can upload under their own prefix');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('receipts', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/evil.jpg')$$,
  '42501', null, 'A cannot upload under B''s prefix');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('receipts', 'loose.jpg')$$,
  '42501', null, 'A cannot upload outside a user prefix');
delete from storage.objects where name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/r2.jpg';
select is((select count(*) from storage.objects where bucket_id = 'receipts'), 1::bigint, 'A can delete their own file');

-- ---------------------------------------------- back to the owner: B must be untouched
reset role;
select is((select amount_laari from public.expenses where id = 'd0d0d0d0-0000-0000-0000-00000000000b'), 99900::bigint, 'A could not change or delete B''s expense');
select is((select count(*) from public.categories where user_id is null and name_en = 'hacked'), 0::bigint, 'A could not edit a default category');
select is((select count(*) from public.categories where user_id is null), 10::bigint, 'A could not delete a default category');
select is((select language from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'dv', 'A could not change B''s profile');
select is((select count(*) from storage.objects where name = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/r1.jpg'), 1::bigint, 'A could not delete B''s file');

-- ------------------------------------------------------------------ as anon
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select * from public.expenses$$, '42501', null, 'signed-out users cannot read expenses');
select throws_ok($$select * from public.scan_usage$$, '42501', null, 'signed-out users cannot read scan_usage');
select throws_ok($$select * from public.receipts$$, '42501', null, 'signed-out users cannot read receipts');
select is((select count(*) from public.categories), 10::bigint, 'signed-out users can read the default categories only');

-- ------------------------------------------------------------ as service role
reset role;
set local role service_role;
select throws_ok($$select * from public.expenses$$, '42501', null, 'the service role has no access to expenses');
select throws_ok($$update public.scan_usage set scans_used = 0$$, '42501', null, 'the service role changes scan_usage only through the functions');
select is(public.reserve_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01', 2), 1, 'reserve_scan starts a new month at 1');
select is(public.reserve_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01', 2), 2, 'reserve_scan counts up to the limit');
select is(public.reserve_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01', 2), null::int, 'reserve_scan refuses past the limit');
select is((select 1 from public.refund_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01') ) , 1, 'refund_scan runs');
select is(public.reserve_scan('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-12-01', 2), 2, 'a refunded scan can be used again');

select * from finish();
rollback;
