-- Tests for migration 004: register, trusted contacts, release cases, audit log.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ------------------------------------------------------------------ fixtures
-- A = owner, B = another user, C = a trusted contact of A (verified email), D = unrelated user.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', now(), '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', now(), '{}', '{}', now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.test', now(), '{}', '{}', now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@example.test', now(), '{}', '{}', now(), now());

select is((select count(*) from public.release_cases where user_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd')), 4::bigint, 'every new user gets a release case');
select is((select count(*) from public.release_cases where state = 'active' and released_at is null and user_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd')), 4::bigint, 'cases start active');

-- Owner A's register content.
insert into public.accounts (id, user_id, name, type) values ('a1a1a1a1-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A cash', 'cash');
insert into public.debts (id, user_id, lender, kind, original_laari, balance_laari, min_payment_laari) values
  ('d1d1d1d1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A lender', 'bank', 200000, 100000, 10000),
  ('d1d1d1d1-0000-0000-0000-00000000000f', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cleared lender', 'bank', 50000, 20000, 1000);
insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, debt_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 30000, 'expense', '2026-11-01', 'd1d1d1d1-0000-0000-0000-00000000000a'
from public.categories where name_en = 'Debt payment';
insert into public.transactions (user_id, account_id, category_id, amount_laari, kind, occurred_on, debt_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-0000-0000-000000000001', id, 20000, 'expense', '2026-11-01', 'd1d1d1d1-0000-0000-0000-00000000000f'
from public.categories where name_en = 'Debt payment';
insert into public.receivables (user_id, debtor, amount_laari) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hassan', 25000);
insert into public.commitments (user_id, type, amount_laari, schedule, recipient_note) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'zakat', 90000, 'ramadan', 'secret recipient');
insert into public.debts (id, user_id, lender, kind, original_laari, balance_laari) values
  ('d1d1d1d1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B lender', 'bank', 1, 1);

-- ------------------------------------------------------------------ as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

-- Release cases: readable, but no client can ever write one (so no client can "release" itself).
select is((select count(*) from public.release_cases), 1::bigint, 'A sees only own release case');
select throws_ok($$update public.release_cases set state = 'released', released_at = now()$$, '42501', null, 'A cannot release their own case');
select throws_ok($$insert into public.release_cases (user_id, state, released_at) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'released', now())$$, '42501', null, 'A cannot insert a released case');
select throws_ok($$delete from public.release_cases$$, '42501', null, 'A cannot delete a case');

-- Audit log: readable, never writable by a client.
select throws_ok($$insert into public.audit_log (user_id, actor, event) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user', 'note_changed')$$, '42501', null, 'A cannot write the audit log');
select throws_ok($$update public.audit_log set event = 'contact_revoked'$$, '42501', null, 'A cannot edit the audit log');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'A cannot delete audit entries');
select throws_ok($$select * from public.invite_attempts$$, '42501', null, 'clients cannot read the invite throttle');

-- Trusted contacts: invite.
select lives_ok($$insert into public.trusted_contacts (id, user_id, name, email, phone, invite_token_hash, invite_expires_at, consented_at)
  values ('c1c1c1c1-0000-0000-0000-00000000000c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cee', 'C@Example.test', null, repeat('a', 64), now() + interval '999 days', now() - interval '999 days')$$,
  'A can invite a contact with consent');
select is((select status from public.trusted_contacts where id = 'c1c1c1c1-0000-0000-0000-00000000000c'), 'invited', 'a new contact is always invited');
select ok((select invite_expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour' from public.trusted_contacts where id = 'c1c1c1c1-0000-0000-0000-00000000000c'),
  'the server fixes the invite expiry at 7 days, whatever the client sent');
select ok((select consented_at between now() - interval '1 minute' and now() + interval '1 minute' from public.trusted_contacts where id = 'c1c1c1c1-0000-0000-0000-00000000000c'),
  'the server stamps the consent time');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dup', 'c@example.test', repeat('b', 64), now(), now())$$, '23505', null, 'the same email cannot be invited twice (case-insensitive)');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'NoConsent', 'x@example.test', repeat('b', 64), now())$$, '23514', null, 'inviting without consent is refused');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bad', 'not-an-email', repeat('b', 64), now(), now())$$, '23514', null, 'an invalid email is refused');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BadHash', 'y@example.test', 'short', now(), now())$$, '23514', null, 'a malformed token hash is refused');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'NoHash', 'z@example.test', null, now(), now())$$, '23514', null, 'a missing token hash is refused');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ForB', 'q@example.test', repeat('b', 64), now(), now())$$, '42501', null, 'A cannot invite a contact for B');

select lives_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Two', 'two@example.test', repeat('2', 64), now(), now())$$, 'second contact');
select lives_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Three', 'three@example.test', repeat('3', 64), now(), now())$$, 'third contact');
select throws_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Four', 'four@example.test', repeat('4', 64), now(), now())$$, '23514', null, 'a fourth contact is refused');

-- A can only revoke; nothing else about a contact is client-writable.
select throws_ok($$update public.trusted_contacts set status = 'accepted' where email = 'two@example.test'$$, '42501', null, 'A cannot mark a contact accepted');
select throws_ok($$update public.trusted_contacts set name = 'Renamed' where email = 'two@example.test'$$, '42501', null, 'A cannot edit a contact (column not granted)');
select throws_ok($$update public.trusted_contacts set invite_token_hash = repeat('f', 64) where email = 'two@example.test'$$, '42501', null, 'A cannot replace a token hash');
select throws_ok($$delete from public.trusted_contacts$$, '42501', null, 'A cannot erase contacts (they are revoked, so the trail stays)');
select lives_ok($$update public.trusted_contacts set status = 'revoked' where email = 'three@example.test'$$, 'A can revoke a contact');
select is((select status from public.trusted_contacts where email = 'three@example.test'), 'revoked', 'the contact is revoked');
select ok((select revoked_at is not null and invite_token_hash is null from public.trusted_contacts where email = 'three@example.test'), 'revoking stamps the time and spends the token');
select throws_ok($$update public.trusted_contacts set status = 'invited' where email = 'three@example.test'$$, '42501', null, 'a revoked contact cannot be un-revoked');
select lives_ok($$insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Four', 'four@example.test', repeat('4', 64), now(), now())$$, 'a revoked contact frees a slot');
select throws_ok($$update public.trusted_contacts set status = 'revoked' where email = 'three@example.test'$$, '42501', null, 'revoking twice is refused');

-- Audit trail written by the database.
select is((select count(*) from public.audit_log where event = 'contact_invited' and actor = 'user'), 4::bigint, 'each invite is logged');
select is((select count(*) from public.audit_log where event = 'contact_revoked' and actor = 'user'), 1::bigint, 'the revoke is logged');
select is((select count(*) from public.audit_log where meta::text like '%@%'), 0::bigint, 'the log never holds an email address');

-- Instruction note (encrypted).
select lives_ok($$select public.set_wasiyyah_note('Please call my brother first.')$$, 'A can write the note');
select is((select public.get_wasiyyah_note()), 'Please call my brother first.', 'A reads the note back');
select throws_ok($$insert into public.wasiyyah_notes (user_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'clients cannot write the note table directly');
select throws_ok($$update public.wasiyyah_notes set note_secret_id = gen_random_uuid()$$, '42501', null, 'clients cannot repoint the note secret');
select throws_ok($$select public.set_wasiyyah_note(repeat('x', 5001))$$, '22001', null, 'an over-long note is refused');
select is((select count(*) from public.audit_log where event = 'note_changed'), 1::bigint, 'the note change is logged without its content');
select lives_ok($$select public.set_wasiyyah_note('Updated note.')$$, 'A can replace the note');
select is((select public.get_wasiyyah_note()), 'Updated note.', 'the note was replaced');

-- Sharing the register is logged by section only.
select lives_ok($$select public.log_register_shared(array['debts', 'note'])$$, 'sharing can be logged');
select throws_ok($$select public.log_register_shared(array['debts', 'passwords'])$$, '22023', null, 'unknown sections are refused');
select throws_ok($$select public.log_register_shared(array[]::text[])$$, '22023', null, 'an empty share is refused');
select is((select meta->'sections' from public.audit_log where event = 'register_shared'), '["debts","note"]'::jsonb, 'the log records section names only');

-- A's own secrets for a debt, so the contact view has encrypted values to decrypt.
select lives_ok($$select public.set_debt_secrets('d1d1d1d1-0000-0000-0000-00000000000a', 'ACC-777', 'call Ali first')$$, 'A stores debt secrets');

-- ------------------------------------------------------------------ as user B
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select is((select count(*) from public.trusted_contacts), 0::bigint, 'B sees none of A contacts');
select is((select count(*) from public.audit_log), 0::bigint, 'B sees none of A audit log');
select is((select count(*) from public.release_cases where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot see A release case');
select is((select public.get_wasiyyah_note()), null, 'B has no note, and cannot read A note');
select lives_ok($$update public.trusted_contacts set status = 'revoked'$$, 'B revoking A contacts changes nothing');
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'B is not a contact of A');

-- ------------------------------------------------------------------ as anon
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok('select * from public.trusted_contacts', '42501', null, 'anon cannot read contacts');
select throws_ok('select * from public.audit_log', '42501', null, 'anon cannot read the audit log');
select throws_ok('select * from public.release_cases', '42501', null, 'anon cannot read release cases');
select throws_ok('select * from public.wasiyyah_notes', '42501', null, 'anon cannot read notes');
select throws_ok($$select public.get_wasiyyah_note()$$, '42501', null, 'anon cannot call get_wasiyyah_note');
select throws_ok($$select public.set_wasiyyah_note('x')$$, '42501', null, 'anon cannot call set_wasiyyah_note');
select throws_ok($$select public.log_register_shared(array['debts'])$$, '42501', null, 'anon cannot log a share');
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'anon cannot read a register');

-- ---------------------------------------------- the note is encrypted at rest
reset role;
select isnt((select secret from vault.secrets where name = 'wasiyyah:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:note'), 'Updated note.', 'the note is not stored as plaintext');
select is((select count(*) from vault.secrets where name like 'wasiyyah:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:%'), 1::bigint, 'one secret per note');

-- ------------------------- contacts reading the register: only when released
-- Contact C accepts (done server-side, as the invite function would).
update public.trusted_contacts set status = 'accepted' where lower(email) = 'c@example.test' and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select status from public.trusted_contacts where lower(email) = 'c@example.test'), 'accepted', 'the server can accept a contact');
select ok((select accepted_at is not null and invite_token_hash is null from public.trusted_contacts where lower(email) = 'c@example.test'), 'accepting spends the invite token');
select is((select count(*) from public.audit_log where event = 'contact_accepted' and actor = 'contact' and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'the acceptance is logged as the contact acting');

-- A pending contact declining server-side is logged as a decline.
update public.trusted_contacts set status = 'revoked' where email = 'two@example.test';
select is((select count(*) from public.audit_log where event = 'contact_declined' and actor = 'contact' and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'a decline is logged as such');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);

select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'RULE 3: an accepted contact sees nothing while the case is active');

reset role;
update public.release_cases set state = 'quiet' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'nor while quiet');

reset role;
update public.release_cases set state = 'contacts_asked' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'nor while contacts are still being asked');
select is((select count(*) from public.debts), 0::bigint, 'C cannot read debts directly, whatever the case state');

reset role;
update public.release_cases set state = 'released', released_at = now() where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);

select is((select jsonb_array_length(public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'debts')), 1::int, 'once released, the contact sees the debts still owed (cleared ones are left out)');
select is((select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'debts'->0->>'lender'), 'A lender', 'the lender');
select is((select (public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'debts'->0->>'balance_laari')::bigint), 70000::bigint, 'the balance is derived server-side (100000 - 30000)');
select is((select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'debts'->0->>'reference_no'), 'ACC-777', 'the encrypted reference number is decrypted for the contact');
select is((select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'debts'->0->>'notes'), 'call Ali first', 'and the notes (who to contact first)');
select is((select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'note'), 'Updated note.', 'and the instruction note');
select is((select jsonb_array_length(public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'receivables')), 1::int, 'receivables');
select is((select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'giving'->0->>'type'), 'zakat', 'pending giving');
select ok((select position('secret recipient' in public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text) = 0), 'the private recipient note stays private');
select is((select count(*) from public.debts), 0::bigint, 'even when released, tables stay closed: the contact only gets the function result');

-- Other callers are still refused when the case IS released.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'a stranger is refused even after release');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'the owner is not their own contact (they use their own data)');
select ok((select count(*) from public.audit_log where event = 'register_viewed' and actor = 'contact') >= 1, 'the owner can see that a contact viewed the register');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, '42501', null, 'a contact of A cannot read B register');

-- A revoked contact, an unverified email and a case that is no longer released all lose access.
reset role;
update public.trusted_contacts set status = 'revoked' where lower(email) = 'c@example.test';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'a revoked contact loses access immediately, even though the case is released');

reset role;
update public.trusted_contacts set status = 'accepted' where lower(email) = 'c@example.test';
update auth.users set email_confirmed_at = null where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'an unverified email is refused (the contact must prove they own the address)');

reset role;
update auth.users set email_confirmed_at = now() where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.release_cases set state = 'cancelled', released_at = null where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'if the owner cancels the release, access ends at once');

-- A pending (not yet accepted) invite gives no access either.
reset role;
update public.release_cases set state = 'released', released_at = now() where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update public.trusted_contacts set status = 'revoked' where lower(email) = 'c@example.test';
insert into public.trusted_contacts (user_id, name, email, invite_token_hash, invite_expires_at, consented_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cee again', 'c@example.test', repeat('9', 64), now(), now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'an invited-but-not-accepted contact sees nothing, even after release');

-- ------------------------------------------------ deleting the account deletes it all
reset role;
select is((select count(*) from public.trusted_contacts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') > 0, true, 'A has contacts before deletion');
delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select count(*) from public.trusted_contacts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'contacts are deleted with the account');
select is((select count(*) from public.release_cases where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'the release case is deleted with the account');
select is((select count(*) from public.audit_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'the audit log is deleted with the account');
select is((select count(*) from public.wasiyyah_notes where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'the note row is deleted with the account');
select is((select count(*) from public.debts where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'debts are deleted with the account');
select is((select count(*) from public.transactions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'transactions are deleted with the account (no foreign-key blocker)');
select is((select count(*) from vault.secrets where name like 'wasiyyah:aaaaaaaa-%' or name like 'debt:d1d1d1d1-0000-0000-0000-00000000000a:%'), 0::bigint, 'every encrypted secret is deleted with the account');

select * from finish();
rollback;
