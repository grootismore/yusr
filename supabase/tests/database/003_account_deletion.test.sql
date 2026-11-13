-- Deleting an account removes everything the person had, including the encrypted register details,
-- and does not touch anyone else's data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', now(), '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', now(), '{}', '{}', now(), now());

-- A has a bit of everything.
insert into public.expenses (id, user_id, amount_laari, spent_at) values ('d0d0d0d0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5000, '2026-11-01');
insert into public.sadaqah_entries (user_id, expense_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0d0d0d0-0000-0000-0000-00000000000a');
insert into public.debts (id, user_id, lender, kind, opening_balance_laari) values ('de000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bank', 'bank', 100000);
insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'de000000-0000-0000-0000-00000000000a', 1000, '2026-11-01');
insert into public.zakat_settings (user_id, sadaqah_goal_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5000);
insert into public.trusted_contacts (id, user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('c1c1c1c1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C', 'c@example.test', repeat('a', 64), now(), now());
update public.trusted_contacts set status = 'accepted';
insert into public.release_confirmations (user_id, contact_id, answer) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-0000-0000-00000000000a', 'fine');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select public.save_register_item(null, 'wish', 'A wish', null, null, 'secret details');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select public.save_register_item(null, 'wish', 'B wish', null, null, 'B secret');
reset role;

select is((select count(*) from vault.secrets), 2::bigint, 'both secrets exist before deletion');

select lives_ok($$delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'an account with register items can be deleted');

select is((select count(*) from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'profile is gone');
select is((select count(*) from public.expenses where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        + (select count(*) from public.sadaqah_entries where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        + (select count(*) from public.debts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        + (select count(*) from public.debt_payments where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        + (select count(*) from public.zakat_settings where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'spending, debts, giving and settings are gone');
select is((select count(*) from public.trusted_contacts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        + (select count(*) from public.release_confirmations where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
        + (select count(*) from public.release_checkins where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'contacts, answers and the ladder are gone');
select is((select count(*) from public.register_items where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'register items are gone');
select is((select count(*) from public.audit_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'the audit log is gone');
select is((select count(*) from vault.secrets where name like 'register:%'), 1::bigint, 'A''s encrypted details are deleted from the vault, B''s remain');
select is((select count(*) from public.register_items where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 1::bigint, 'B''s data is untouched');

-- Deleting a single item (account still there) is still audited.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
delete from public.register_items;
reset role;
select is((select count(*) from public.audit_log where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and event = 'register_item_changed' and meta->>'deleted' = 'true'), 1::bigint, 'deleting one item is still audited while the account exists');

select * from finish();
rollback;
