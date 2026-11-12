-- Tests for migration 006: consents, account deletion (7-day grace) and data export.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- A signs up with all three confirmations; B signs up with none of them.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', now(), '{}',
   '{"consents":{"terms":"2026-11-01","privacy":"2026-11-01","age_18":"2026-11-01"}}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', now(), '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', now(), '{}',
   '{"consents":{"terms":"x","privacy":["bad"],"age_18":""}}', now(), now());

select is((select count(*) from public.consents where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 3::bigint, 'sign-up metadata is recorded as three consents');
select is((select count(*) from public.consents where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'nothing is recorded when nothing was confirmed');
select is((select count(*) from public.release_cases where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'sign-up still creates a release case');
select is((select count(*) from public.consents where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 1::bigint, 'malformed entries are skipped, valid ones kept');

-- A's data, including encrypted secrets, and B's data.
insert into public.debts (id, user_id, lender, kind, original_laari, balance_laari) values
  ('d1d1d1d1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A lender', 'bank', 200000, 100000),
  ('d1d1d1d1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B lender', 'bank', 1, 1);
insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contact', 'contact@example.test', repeat('a', 64), now() + interval '7 days', now());

-- ------------------------------------------------------------------ as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.consents), 3::bigint, 'A reads only their own consents');
select lives_ok($$insert into public.consents (kind, version) values ('terms', '2027-01-01')$$, 'A can record a new version');
select throws_ok($$insert into public.consents (user_id, kind, version) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'terms', 'z')$$, '42501', null, 'A cannot record a consent for B');
select throws_ok($$update public.consents set version = 'tampered'$$, '42501', null, 'consents cannot be edited');
select throws_ok($$delete from public.consents$$, '42501', null, 'consents cannot be deleted');
select throws_ok($$insert into public.consents (kind, version) values ('marketing', '1')$$, '23514', null, 'only known consent kinds');

select set_config('yusr.test', 'x', true);
select lives_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', 'REF-123', 'private note')$$, 'A stores debt secrets');
select lives_ok($$select public.set_wasiyyah_note('my instructions')$$, 'A stores a note');

-- Export.
select is((public.export_my_data() -> 'debts' -> 0 ->> 'reference_no'), 'REF-123', 'export decrypts the debt reference for its owner');
select is((public.export_my_data() -> 'debts' -> 0 ->> 'notes'), 'private note', 'export decrypts the debt notes');
select is((public.export_my_data() ->> 'wasiyyah_note'), 'my instructions', 'export includes the Wasiyyah note');
select is(jsonb_array_length(public.export_my_data() -> 'debts'), 1, 'export holds only A''s debts');
select ok(not (public.export_my_data() -> 'debts' -> 0) ? 'reference_secret_id', 'export hides internal secret ids');
select ok(not (public.export_my_data() -> 'trusted_contacts' -> 0) ? 'invite_token_hash', 'export hides the invite token hash');
select is((public.export_my_data() -> 'profile' ->> 'user_id'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'export includes the profile');

-- Deletion request.
select is((select count(*) from public.deletion_requests), 0::bigint, 'no request yet');
select lives_ok($$select public.request_account_deletion()$$, 'A requests deletion');
select ok((select scheduled_for from public.deletion_requests) between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour', 'deletion is scheduled 7 days out');
select lives_ok($$select public.request_account_deletion()$$, 'asking twice is harmless');
select is((select count(*) from public.deletion_requests), 1::bigint, 'still one request');
select throws_ok($$insert into public.deletion_requests (user_id, scheduled_for) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())$$, '42501', null, 'a client cannot write a request directly');
select throws_ok($$update public.deletion_requests set scheduled_for = now()$$, '42501', null, 'a client cannot shorten the wait');
select throws_ok($$select public.purge_due_account_deletions()$$, '42501', null, 'a client cannot run the purge');

-- As B: sees nothing of A.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.deletion_requests), 0::bigint, 'B cannot see A''s deletion request');
select is((select count(*) from public.consents), 0::bigint, 'B cannot see A''s consents');
select is(jsonb_array_length(public.export_my_data() -> 'debts'), 1, 'B''s export holds only B''s data');
select is((public.export_my_data() -> 'debts' -> 0 ->> 'lender'), 'B lender', 'B''s export is B''s');
select lives_ok($$select public.cancel_account_deletion()$$, 'B cancelling does nothing to A');
select is((select count(*) from public.deletion_requests), 0::bigint, 'still invisible to B');

-- Anonymous callers: nothing.
reset role;
set local role anon;
select throws_ok($$select public.export_my_data()$$, '42501', null, 'anon cannot export');
select throws_ok($$select public.request_account_deletion()$$, '42501', null, 'anon cannot request deletion');
reset role;

-- Not yet due: the purge leaves A alone.
select is(public.purge_due_account_deletions(), 0, 'purge does nothing before the date');
select is((select count(*) from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'A still exists');

-- A cancels, then asks again: cancelling really removes the request.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$select public.cancel_account_deletion()$$, 'A cancels');
select is((select count(*) from public.deletion_requests), 0::bigint, 'request removed');
select lives_ok($$select public.request_account_deletion()$$, 'A asks again');
reset role;

-- Seven days later: everything of A's goes, B and C are untouched.
update public.deletion_requests set scheduled_for = now() - interval '1 minute';
select is(public.purge_due_account_deletions(), 1, 'the purge removes the one due account');
select is((select count(*) from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'A is gone');
select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'profile gone');
select is((select count(*) from public.debts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'debts gone');
select is((select count(*) from public.trusted_contacts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'trusted contacts gone');
select is((select count(*) from public.release_cases where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'release case gone');
select is((select count(*) from public.audit_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'audit log gone');
select is((select count(*) from public.consents where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'consents gone');
select is((select count(*) from vault.secrets where name like 'wasiyyah:aaaaaaaa-%' or name like 'debt:d1d1d1d1-0000-0000-0000-00000000000a:%'), 0::bigint, 'encrypted secrets gone');
select is((select count(*) from public.debts where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 1::bigint, 'B''s data untouched');
select is((select count(*) from auth.users where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 1::bigint, 'C untouched');

-- The nightly job exists.
select is((select count(*) from cron.job where jobname = 'purge-due-account-deletions'), 1::bigint, 'the purge is scheduled');

select * from finish();
rollback;
