// Run: node --experimental-strip-types --test supabase/functions/iou-nudges/nudges.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { message, runNudges, shouldNudge, type Candidate } from './run.ts';

const c = (over: Partial<Candidate> = {}): Candidate => ({ id: 'i1', to: 'b@example.test', title: 'Rent help', amount_laari: 50_000, paid_laari: 0, due_on: '2026-12-10', makerName: 'Aisha', sent: [], ...over });

test('nudges from two days before the due date, never earlier', () => {
  assert.equal(shouldNudge(c(), '2026-12-07'), false);
  assert.equal(shouldNudge(c(), '2026-12-08'), true);
  assert.equal(shouldNudge(c(), '2026-12-20'), true); // overdue
});
test('waits three days between nudges and stops after six', () => {
  assert.equal(shouldNudge(c({ sent: ['2026-12-08'] }), '2026-12-10'), false);
  assert.equal(shouldNudge(c({ sent: ['2026-12-08'] }), '2026-12-11'), true);
  assert.equal(shouldNudge(c({ sent: ['1', '2', '3', '4', '5', '6'].map((d) => `2026-12-0${d}`) }), '2027-01-30'), false);
});
test('never nudges once it is paid', () => {
  assert.equal(shouldNudge(c({ paid_laari: 50_000 }), '2026-12-12'), false);
  assert.equal(shouldNudge(c({ paid_laari: 20_000 }), '2026-12-12'), true);
});
test('sends once, logs it, and says what is left', async () => {
  const sent: string[] = [], logged: string[] = [];
  const r = await runNudges({ today: '2026-12-09', candidates: async () => [c({ paid_laari: 20_000 }), c({ id: 'i2', paid_laari: 50_000 })], send: async (x, m) => { sent.push(`${x.to}|${m.body}`); }, log: async (id) => { logged.push(id); } });
  assert.deepEqual(r, { sent: 1, failed: 0 });
  assert.deepEqual(logged, ['i1']);
  assert.match(sent[0], /Aisha asked Kharadhu/);
  assert.match(sent[0], /MVR 300\.00/);
  assert.match(message(c({ makerName: null })).body, /^Someone you know/);
});
test('a failed send is counted and not logged', async () => {
  const logged: string[] = [];
  const r = await runNudges({ today: '2026-12-09', candidates: async () => [c()], send: async () => { throw new Error('resend 500'); }, log: async (id) => { logged.push(id); } });
  assert.deepEqual(r, { sent: 0, failed: 1 });
  assert.deepEqual(logged, []);
});
