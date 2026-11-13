-- Access-path tests for migrations 004-006: debts, giving, the register, trusted contacts and the
-- release ladder. Every way a person or a trusted contact could reach (or change) data is tried.
begin;
create extension if not exists pgtap with schema extensions;
select plan(94);

-- ------------------------------------------------------------------ fixtures (as owner)
-- A: owner with 3 contacts (C, D, and E whose email is NOT verified). B: owner with one contact (C).
-- H: owner used for the "fine", cancel and away-mode cases. G: a stranger.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v.email,
       case when v.confirmed then now() end, '{}', '{}', now(), now()
from (values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.test', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.test', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@example.test', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@example.test', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'e@example.test', false),
  ('99999999-9999-9999-9999-999999999999', 'g@example.test', true),
  ('11111111-1111-1111-1111-111111111111', 'h@example.test', true)
) as v(id, email, confirmed);

-- Contacts are added as the server would (consent stamped, then accepted).
insert into public.trusted_contacts (id, user_id, name, email, invite_token_hash, invite_expires_at, consented_at) values
  ('c1c1c1c1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C', 'c@example.test', repeat('a', 64), now(), now()),
  ('d1d1d1d1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D', 'd@example.test', repeat('b', 64), now(), now()),
  ('e1e1e1e1-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'E', 'e@example.test', repeat('c', 64), now(), now()),
  ('c1c1c1c1-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'C', 'c@example.test', repeat('d', 64), now(), now()),
  ('c1c1c1c1-0000-0000-0000-00000000000f', '11111111-1111-1111-1111-111111111111', 'C', 'c@example.test', repeat('e', 64), now(), now());
update public.trusted_contacts set status = 'accepted';

insert into public.debts (id, user_id, lender, kind, opening_balance_laari, interest_bearing, in_register) values
  ('de000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BML loan', 'loan', 10000000, true, true),
  ('de000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Private debt', 'personal', 500000, false, false),
  ('de000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B debt', 'bank', 99900, false, true);
insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'de000000-0000-0000-0000-00000000000a', 2500000, '2026-11-01'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'de000000-0000-0000-0000-00000000000b', 100, '2026-11-01');
insert into public.expenses (id, user_id, amount_laari, spent_at) values
  ('d0d0d0d0-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5000, '2026-11-01'),
  ('d0d0d0d0-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 7000, '2026-11-01');
insert into public.sadaqah_entries (user_id, expense_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0d0d0d0-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd0d0d0d0-0000-0000-0000-00000000000b');
insert into public.zakat_settings (user_id, sadaqah_goal_laari) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100000), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 200000);

select is((select count(*) from public.release_checkins), 7::bigint, 'every user gets a ladder row that starts active');
select is((select enabled from public.release_config where id = 1), false, 'the release kill switch ships OFF');
select is((select count(*) from public.audit_log where event = 'contact_invited'), 5::bigint, 'inviting a contact is audited by the database');

-- ------------------------------------------------------------------ constraints
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, interest_bearing) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'qard_hasan', 100, true)$$,
  '23514', null, 'a qard hasan can never be interest-bearing');
select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari, interest_bearing, interest_rate_bps) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'personal', 100, false, 500)$$,
  '23514', null, 'an interest rate needs an interest-bearing debt');

-- ------------------------------------------------------------------ as owner A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select is((select count(*) from public.debts), 2::bigint, 'A sees only their own debts');
select is((select count(*) from public.debt_payments), 1::bigint, 'A sees only their own payments');
select is((select balance_laari from public.debt_balances where id = 'de000000-0000-0000-0000-00000000000a'), 7500000::bigint, 'the balance is derived: opening minus payments');
select is((select count(*) from public.debt_balances), 2::bigint, 'the balance view shows only A''s debts');
select is((select count(*) from public.sadaqah_entries), 1::bigint, 'A sees only their own giving entries');
select is((select count(*) from public.zakat_settings), 1::bigint, 'A sees only their own settings');

select throws_ok($$insert into public.debts (user_id, lender, kind, opening_balance_laari) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'bank', 100)$$,
  '42501', null, 'A cannot add a debt for B');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'de000000-0000-0000-0000-00000000000b', 100, '2026-11-02')$$,
  '23503', null, 'A cannot record a payment against B''s debt');
select throws_ok($$insert into public.debt_payments (user_id, debt_id, amount_laari, paid_on) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'de000000-0000-0000-0000-00000000000b', 100, '2026-11-02')$$,
  '42501', null, 'A cannot record a payment for B');
select throws_ok($$insert into public.sadaqah_entries (user_id, expense_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0d0d0d0-0000-0000-0000-00000000000b')$$,
  '42501', null, 'A cannot log giving against B''s expense');
select throws_ok($$insert into public.zakat_settings (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  '42501', null, 'A cannot write B''s settings');

-- register items go through save_register_item; nothing else writes them
select throws_ok($$insert into public.register_items (user_id, kind, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'wish', 'x')$$,
  '42501', null, 'clients cannot insert register items directly');
select throws_ok($$update public.register_items set title = 'x'$$, '42501', null, 'clients cannot update register items directly');
select ok((select public.save_register_item(null, 'debt', 'Owed to Ali', 'Ali', 150000, 'Call him first. Receipt is in the blue folder.')) is not null, 'A can save a register item');
select is((select count(*) from public.register_items), 1::bigint, 'A sees their register item');
select is((select public.get_register_item_details((select id from public.register_items))), 'Call him first. Receipt is in the blue folder.', 'A can read their own details back');
select throws_ok($$select count(*) from vault.secrets$$, '42501', null, 'clients cannot read the vault directly');
select throws_ok($$select public.save_register_item(null, 'nope', 'x', null, null, null)$$,
  '23514', null, 'an unknown register kind is refused');

-- the ladder, the log and the kill switch are read-only or invisible to clients
select is((select count(*) from public.release_checkins), 1::bigint, 'A sees only their own ladder row');
select throws_ok($$update public.release_checkins set state = 'released'$$, '42501', null, 'A cannot release their own register');
select throws_ok($$update public.release_checkins set last_active_at = now()$$, '42501', null, 'A cannot write the ladder directly');
select throws_ok($$insert into public.audit_log (user_id, actor, event) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user', 'checkin_okay')$$, '42501', null, 'A cannot write the audit log');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'A cannot delete audit entries');
select throws_ok($$select * from public.release_config$$, '42501', null, 'clients cannot read the kill switch');
select throws_ok($$update public.release_config set enabled = true$$, '42501', null, 'clients cannot turn the release flow on');
select throws_ok($$insert into public.release_confirmations (user_id, contact_id, answer) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1c1c1c1-0000-0000-0000-00000000000a', 'passed')$$, '42501', null, 'A cannot forge a contact''s answer');
select throws_ok($$select public.release_eligible('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'clients cannot call release_eligible');
select throws_ok($$select public.log_release_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'notice_sent')$$, '42501', null, 'clients cannot call log_release_event');
select throws_ok($$update public.trusted_contacts set name = 'x'$$, '42501', null, 'A cannot edit a contact (only revoke)');
select is((select count(*) from public.trusted_contacts), 3::bigint, 'A sees only their own contacts');
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'the owner is not a contact: no access through the contact function');
select throws_ok($$select public.set_away_mode(91)$$, '22023', null, 'away mode is at most 90 days');

-- ------------------------------------------------------------------ as owner B (isolation)
reset role; set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.register_items), 0::bigint, 'B cannot see A''s register items');
select is((select public.get_register_item_details((select id from public.register_items limit 1))), null, 'B has nothing to decrypt');
select throws_ok($$select public.save_register_item('00000000-0000-0000-0000-00000000dead', 'wish', 'x', null, null, null)$$, '42501', null, 'B cannot update an item that is not theirs');
select is((select count(*) from public.audit_log where event = 'contact_invited'), 1::bigint, 'B sees only their own audit entries');

-- ----------------------------------------------- trusted contacts have no table access at all
reset role; set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.debts) + (select count(*) from public.register_items) + (select count(*) from public.sadaqah_entries)
          + (select count(*) from public.release_checkins where user_id <> 'cccccccc-cccc-cccc-cccc-cccccccccccc') + (select count(*) from public.audit_log)
          + (select count(*) from public.trusted_contacts),
          0::bigint, 'a trusted contact reads nothing from any table (no client policy exists for them)');
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'a contact cannot read the register while the owner is active');
select is((select count(*) from public.contact_cases()), 0::bigint, 'a contact sees no cases while nobody is being asked');
select throws_ok($$select public.answer_release_check('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'passed')$$, '42501', null, 'a contact cannot answer before they are asked');

-- ------------------------------------------------------------------ the ladder (service role)
reset role; set local role service_role;
select throws_ok($$update public.release_checkins set state = 'quiet' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'no step to quiet before 30 days of inactivity');
select throws_ok($$update public.release_checkins set state = 'contacts_asked' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'the ladder cannot skip steps');
select throws_ok($$select * from public.debts$$, '42501', null, 'the service role cannot read debts');
select throws_ok($$select * from public.register_items$$, '42501', null, 'the service role cannot read register items');
select throws_ok($$update public.release_config set enabled = true$$, '42501', null, 'the service role cannot flip the kill switch');
select throws_ok($$update public.release_checkins set last_active_at = now() - interval '90 days' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '42501', null, 'the service role can only move the state, not fake inactivity');

reset role;
update public.release_checkins set last_active_at = now() - interval '31 days' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role service_role;
update public.release_checkins set state = 'quiet' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
reset role;
select is((select state from public.release_checkins where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'quiet', 'after 31 days of inactivity the ladder can move to quiet');
select is((select count(*) from public.audit_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and event = 'ladder_advanced' and meta->>'to' = 'quiet'), 1::bigint, 'the move is audited by the database');

set local role service_role;
select throws_ok($$update public.release_checkins set state = 'second_checkin' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'the second check-in waits 7 days');
reset role;
update public.release_checkins set quiet_at = now() - interval '8 days' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role service_role;
update public.release_checkins set state = 'second_checkin' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select throws_ok($$update public.release_checkins set state = 'contacts_asked' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'contacts are asked 7 days after the second check-in');
reset role;
update public.release_checkins set second_checkin_at = now() - interval '8 days' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role service_role;
update public.release_checkins set state = 'contacts_asked' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select throws_ok($$update public.release_checkins set state = 'released' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'with the kill switch off nothing can be released, even with the ladder complete');

-- ------------------------------------------------------ contacts answer, release needs two humans
reset role;
update public.release_config set enabled = true;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.contact_cases()), 1::bigint, 'once asked, the contact sees the case');
select throws_ok($$select public.answer_release_check('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'maybe')$$, '22023', null, 'only fine or passed are accepted');
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'asking is not releasing: the register is still closed');
select lives_ok($$select public.answer_release_check('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'passed')$$, 'contact C confirms');
reset role; set local role service_role;
select throws_ok($$update public.release_checkins set state = 'released' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'one confirmation is not enough when there are several contacts');
reset role; set local role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select throws_ok($$select public.answer_release_check('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'passed')$$, '42501', null, 'a contact whose email is not verified cannot answer');
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
select throws_ok($$select public.answer_release_check('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'passed')$$, '42501', null, 'a stranger cannot answer');
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select lives_ok($$select public.answer_release_check('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'passed')$$, 'contact D confirms');
reset role; set local role service_role;
update public.release_checkins set state = 'released' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
reset role;
select is((select state from public.release_checkins where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'released', 'two different contacts confirmed: released');
select is((select count(*) from public.audit_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and event = 'released'), 1::bigint, 'the release is in the audit log');

-- ------------------------------------------------------------- after release
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is(jsonb_array_length(public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') -> 'items'), 1, 'a confirmed contact can now read the register items');
select is(public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') -> 'items' -> 0 ->> 'details', 'Call him first. Receipt is in the blue folder.', 'including the decrypted details');
select is(public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') -> 'debts' -> 0 ->> 'balance_laari', '7500000', 'and the debts still owed, derived from payments');
select is(jsonb_array_length(public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') -> 'debts'), 1, 'a debt the owner excluded from the register stays private');
select throws_ok($$select public.get_register_for_contact('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, '42501', null, 'release of A gives no access to B''s register');
select throws_ok($$select public.withdraw_release_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'answers cannot be withdrawn after release');
select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'an unverified email cannot read a released register');
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
select throws_ok($$select public.get_register_for_contact('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$, '42501', null, 'a stranger cannot read a released register');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$select public.record_activity()$$, 'the owner opening the app after release does not error');
select throws_ok($$select public.set_away_mode(5)$$, '42501', null, 'the owner cannot use away mode after release');
reset role;
select is((select state from public.release_checkins where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'released', 'a released case stays released');
set local role service_role;
select throws_ok($$update public.release_checkins set state = 'active' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '23514', null, 'a released case is frozen, even for the service role');
reset role;
select is((select count(*) from public.audit_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and event = 'register_viewed'), 4::bigint, 'every successful register view is logged');

-- -------------------------------------------- one contact: their confirmation AND 14 days
-- Fixture only: put B and H straight onto the 'contacts asked' rung (the guard is switched off for this one statement each).
alter table public.release_checkins disable trigger release_checkins_guard_trg;
update public.release_checkins set last_active_at = now() - interval '31 days', quiet_at = now() - interval '9 days', second_checkin_at = now() - interval '8 days', state = 'contacts_asked', contacts_asked_at = now() - interval '2 days'
  where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
alter table public.release_checkins enable trigger release_checkins_guard_trg;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok($$select public.answer_release_check('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'passed')$$, 'the only contact confirms');
reset role; set local role service_role;
select throws_ok($$update public.release_checkins set state = 'released' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$, '23514', null, 'a single contact is not enough on their own: 14 days must pass');
reset role;
update public.release_checkins set contacts_asked_at = now() - interval '15 days' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
set local role service_role;
update public.release_checkins set state = 'released' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
reset role;
select is((select state from public.release_checkins where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'released', 'single contact: released after their confirmation and 14 days');

-- ------------------------------------- inactivity alone, "fine", cancel and away mode (owner H)
alter table public.release_checkins disable trigger release_checkins_guard_trg;
update public.release_checkins set last_active_at = now() - interval '400 days', quiet_at = now() - interval '300 days', second_checkin_at = now() - interval '290 days', state = 'contacts_asked', contacts_asked_at = now() - interval '280 days'
  where user_id = '11111111-1111-1111-1111-111111111111';
alter table public.release_checkins enable trigger release_checkins_guard_trg;
set local role service_role;
select throws_ok($$update public.release_checkins set state = 'released' where user_id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'a year of silence and a complete ladder still releases nothing without confirmation');
reset role; set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok($$select public.answer_release_check('11111111-1111-1111-1111-111111111111', 'fine')$$, 'a contact says they are fine');
reset role; set local role service_role;
select throws_ok($$update public.release_checkins set state = 'released' where user_id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'a "fine" answer blocks release');
reset role; set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok($$select public.record_activity()$$, 'the owner opens the app: the flow is cancelled');
reset role;
select is((select state from public.release_checkins where user_id = '11111111-1111-1111-1111-111111111111'), 'active', 'cancel returns the ladder to active');
select is((select count(*) from public.release_confirmations where user_id = '11111111-1111-1111-1111-111111111111' and withdrawn_at is null), 0::bigint, 'and clears the answers given so far');
select is((select count(*) from public.audit_log where user_id = '11111111-1111-1111-1111-111111111111' and event = 'checkin_okay'), 1::bigint, 'the cancel is audited');

update public.release_checkins set last_active_at = now() - interval '400 days' where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok($$select public.set_away_mode(10)$$, 'the owner turns on away mode for 10 days');
reset role; set local role service_role;
select throws_ok($$update public.release_checkins set state = 'quiet' where user_id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'away mode pauses the ladder');
reset role;
select is((select away_until > now() + interval '9 days' from public.release_checkins where user_id = '11111111-1111-1111-1111-111111111111'), true, 'away mode is recorded');
update public.release_checkins set away_started_at = now() - interval '11 days', away_until = now() - interval '1 day', last_active_at = now() - interval '11 days' where user_id = '11111111-1111-1111-1111-111111111111';
set local role service_role;
select throws_ok($$update public.release_checkins set state = 'quiet' where user_id = '11111111-1111-1111-1111-111111111111'$$, '23514', null, 'after away mode ends, the 30-day clock starts again from the end of it');
reset role;

-- a contact who revokes loses all ability to answer or read
update public.trusted_contacts set status = 'revoked' where id = 'c1c1c1c1-0000-0000-0000-00000000000f';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.contact_cases() where owner_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'a revoked contact sees nothing');

select * from finish();
rollback;
