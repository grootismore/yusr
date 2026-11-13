// Run: node --experimental-strip-types --test supabase/functions/release-ladder/ladder.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, releasable, type Checkin, type Confirmation, type Contact } from './logic.ts';
import { runLadder, type Deps } from './run.ts';
import type { Email } from './emails.ts';

const NOW = new Date('2026-11-13T00:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const ahead = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();
const row = (o: Partial<Checkin> = {}): Checkin => ({ user_id: 'u1', state: 'active', last_active_at: ago(1), quiet_at: null, second_checkin_at: null, contacts_asked_at: null, away_until: null, ...o });
const contact = (id: string, o: Partial<Contact> = {}): Contact => ({ id, name: id, email: `${id}@x.test`, status: 'accepted', inviter_name: 'Aisha', ...o });
const answer = (id: string, a: 'fine' | 'passed', o: Partial<Confirmation> = {}): Confirmation => ({ contact_id: id, answer: a, answered_at: ago(0.1), withdrawn_at: null, ...o });

test('decide: each rung waits its time, and only moves one rung', () => {
  assert.equal(decide(row({ last_active_at: ago(29) }), [], [], NOW), null);
  assert.equal(decide(row({ last_active_at: ago(31) }), [], [], NOW), 'quiet');
  assert.equal(decide(row({ state: 'quiet', quiet_at: ago(6) }), [], [], NOW), null);
  assert.equal(decide(row({ state: 'quiet', quiet_at: ago(8) }), [], [], NOW), 'second_checkin');
  assert.equal(decide(row({ state: 'second_checkin', second_checkin_at: ago(8) }), [], [], NOW), 'contacts_asked');
  assert.equal(decide(row({ state: 'released' }), [], [], NOW), null);
});

test('decide: away mode pauses everything, and the 30 days restart when it ends', () => {
  assert.equal(decide(row({ last_active_at: ago(100), away_until: ahead(5) }), [], [], NOW), null);
  assert.equal(decide(row({ last_active_at: ago(100), away_until: ago(10) }), [], [], NOW), null); // away ended 10 days ago: not yet 30
  assert.equal(decide(row({ last_active_at: ago(100), away_until: ago(31) }), [], [], NOW), 'quiet');
});

test('releasable: two contacts need two different "passed"; one contact needs their answer and 14 days; "fine" and withdrawals count', () => {
  const asked = (days: number) => row({ state: 'contacts_asked', contacts_asked_at: ago(days) });
  const two = [contact('a'), contact('b')];
  assert.equal(releasable(asked(1), two, [answer('a', 'passed')], NOW), false);
  assert.equal(releasable(asked(1), two, [answer('a', 'passed'), answer('b', 'passed')], NOW), true);
  assert.equal(releasable(asked(1), two, [answer('a', 'passed'), answer('a', 'passed')], NOW), false); // same person twice
  assert.equal(releasable(asked(1), two, [answer('a', 'passed'), answer('b', 'passed'), answer('a', 'fine', { contact_id: 'a' })], NOW), false);
  assert.equal(releasable(asked(1), two, [answer('a', 'passed'), answer('b', 'passed', { withdrawn_at: ago(0) })], NOW), false);
  assert.equal(releasable(asked(1), [contact('a'), contact('b', { status: 'revoked' })], [answer('a', 'passed'), answer('b', 'passed')], NOW), false); // revoked contact does not count
  const one = [contact('a')];
  assert.equal(releasable(asked(20), one, [], NOW), false); // 20 days of silence alone is NOT enough
  assert.equal(releasable(asked(5), one, [answer('a', 'passed')], NOW), false);
  assert.equal(releasable(asked(15), one, [answer('a', 'passed')], NOW), true);
  assert.equal(releasable(asked(15), [], [], NOW), false);
});

function fake(rows: Checkin[], o: { enabled?: boolean; contacts?: Contact[]; confirmations?: Confirmation[]; refuse?: boolean; failSend?: boolean } = {}) {
  const sent: Email[] = []; const states: string[] = []; const logs: string[] = [];
  const d: Deps = {
    appUrl: 'https://app.test',
    enabled: async () => o.enabled ?? true,
    listOpen: async () => rows,
    contacts: async () => o.contacts ?? [],
    confirmations: async () => o.confirmations ?? [],
    setState: async (_u, to) => { if (o.refuse) return 'refused'; states.push(to); return 'ok'; },
    log: async (_u, ev, meta) => void logs.push(`${ev}:${meta.step ?? meta.reason}`),
    ownerEmail: async () => 'owner@x.test',
    send: async (e) => { if (o.failSend) throw new Error('resend 500'); sent.push(e); },
  };
  return { d, sent, states, logs };
}

test('kill switch off: nothing is read, sent or moved', async () => {
  const f = fake([row({ last_active_at: ago(400) })], { enabled: false });
  assert.deepEqual(await runLadder(f.d, NOW), { enabled: false, checked: 0, advanced: 0, released: 0, blocked: 0, errors: 0, emails: 0 });
  assert.deepEqual([f.sent.length, f.states.length], [0, 0]);
});

test('30 days quiet: the owner is emailed, then the ladder moves to quiet', async () => {
  const f = fake([row({ last_active_at: ago(31) })]);
  const s = await runLadder(f.d, NOW);
  assert.deepEqual([s.advanced, f.states, f.sent.map((e) => e.to), f.logs], [1, ['quiet'], ['owner@x.test'], ['notice_sent:quiet']]);
  assert.match(f.sent[0].key, /^ladder-first-u1$/);
  assert.ok(!/\d+(\.\d+)?\s?(MVR|laari)/i.test(f.sent[0].text)); // no amounts in emails
});

test('an email that fails to send means nothing moves (it is retried next run)', async () => {
  const f = fake([row({ last_active_at: ago(31) })], { failSend: true });
  const s = await runLadder(f.d, NOW);
  assert.deepEqual([s.errors, s.advanced, f.states], [1, 0, []]);
});

test('away mode: nothing happens for someone who is away', async () => {
  const f = fake([row({ last_active_at: ago(400), away_until: ahead(3) })]);
  assert.deepEqual([(await runLadder(f.d, NOW)).advanced, f.sent.length], [0, 0]);
});

test('contacts are asked: every accepted contact is emailed, nobody else', async () => {
  const f = fake([row({ state: 'second_checkin', second_checkin_at: ago(8) })], { contacts: [contact('a'), contact('b'), contact('c', { status: 'invited' }), contact('d', { status: 'revoked' })] });
  await runLadder(f.d, NOW);
  assert.deepEqual([f.states, f.sent.map((e) => e.to).sort()], [['contacts_asked'], ['a@x.test', 'b@x.test']]);
});

test('release: only after the database says yes; then contacts and the owner are told', async () => {
  const cs = [contact('a'), contact('b')];
  const asked = row({ state: 'contacts_asked', contacts_asked_at: ago(3) });
  const f = fake([asked], { contacts: cs, confirmations: [answer('a', 'passed', { answered_at: ago(5) }), answer('b', 'passed', { answered_at: ago(5) })] });
  const s = await runLadder(f.d, NOW);
  assert.deepEqual([s.released, f.states, f.sent.map((e) => e.to).sort()], [1, ['released'], ['a@x.test', 'b@x.test', 'owner@x.test']]);

  const refused = fake([asked], { contacts: cs, confirmations: [answer('a', 'passed', { answered_at: ago(5) }), answer('b', 'passed', { answered_at: ago(5) })], refuse: true });
  const r = await runLadder(refused.d, NOW);
  assert.deepEqual([r.released, r.blocked, refused.sent.length, refused.logs], [0, 1, 0, ['release_blocked:not_eligible']]); // no email when refused
});

test('inactivity alone never releases: a year of silence at the last rung does nothing', async () => {
  const f = fake([row({ state: 'contacts_asked', contacts_asked_at: ago(300), last_active_at: ago(400) })], { contacts: [contact('a'), contact('b')] });
  const s = await runLadder(f.d, NOW);
  assert.deepEqual([s.released, f.states, f.sent.length], [0, [], 0]);
});

test('a "passed" answer is announced to the owner straight away, once per answer', async () => {
  const f = fake([row({ state: 'contacts_asked', contacts_asked_at: ago(3) })], { contacts: [contact('a'), contact('b')], confirmations: [answer('a', 'passed', { answered_at: ago(0.2) })] });
  await runLadder(f.d, NOW);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].to, 'owner@x.test');
  assert.match(f.sent[0].key, /^ladder-passed-u1-a-/);
});

test('one person failing does not stop the others', async () => {
  const f = fake([row({ user_id: 'bad', last_active_at: ago(31) }), row({ user_id: 'good', last_active_at: ago(31) })]);
  let n = 0;
  const orig = f.d.ownerEmail;
  f.d.ownerEmail = async (u) => { if (u === 'bad') throw new Error('boom'); n++; return orig(u); };
  const s = await runLadder(f.d, NOW);
  assert.deepEqual([s.errors, s.advanced, n], [1, 1, 1]);
});
