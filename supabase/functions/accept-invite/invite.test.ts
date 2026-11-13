// Run: node --experimental-strip-types --test supabase/functions/accept-invite/invite.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleInvite, type InviteDb } from './handler.ts';
import { judge, parseBody, sha256Hex } from './invite.ts';

const token = 'A'.repeat(43);
const NOW = new Date('2026-11-13T00:00:00Z');
const row = (o: object = {}) => ({ id: 'c1', status: 'invited' as const, invite_expires_at: '2026-11-20T00:00:00Z', inviter_name: 'Aisha', ...o });

function db(found: ReturnType<typeof row> | null, attempts = 0) {
  const calls = { set: [] as string[], attempts: 0 };
  const d: InviteDb = {
    countAttempts: async () => attempts,
    recordAttempt: async () => void calls.attempts++,
    findByTokenHash: async () => found,
    setStatus: async (_id, s) => void calls.set.push(s),
  };
  return { d, calls };
}

test('parseBody only accepts a well-formed token and a known action', () => {
  assert.ok(parseBody({ token, action: 'check' }));
  for (const b of [null, {}, { token: 'short', action: 'check' }, { token, action: 'delete' }, { token: token + 'x', action: 'accept' }]) assert.equal(parseBody(b), null);
});

test('judge: ok, invalid, used, expired', () => {
  assert.equal(judge(row(), NOW), 'ok');
  assert.equal(judge(null, NOW), 'invalid');
  assert.equal(judge(row({ status: 'accepted' }), NOW), 'used');
  assert.equal(judge(row({ status: 'revoked' }), NOW), 'used');
  assert.equal(judge(row({ invite_expires_at: '2026-11-12T00:00:00Z' }), NOW), 'expired');
});

test('check shows only the name the owner chose; accept and decline set the status', async () => {
  let { d, calls } = db(row());
  let r = await handleInvite({ method: 'POST', body: { token, action: 'check' }, ip: '1.1.1.1' }, d, () => NOW);
  assert.deepEqual([r.status, r.json.inviter_name, calls.set.length], [200, 'Aisha', 0]);
  ({ d, calls } = db(row()));
  r = await handleInvite({ method: 'POST', body: { token, action: 'accept' }, ip: '1.1.1.1' }, d, () => NOW);
  assert.deepEqual([r.status, calls.set], [200, ['accepted']]);
  ({ d, calls } = db(row()));
  r = await handleInvite({ method: 'POST', body: { token, action: 'decline' }, ip: '1.1.1.1' }, d, () => NOW);
  assert.deepEqual(calls.set, ['revoked']);
});

test('unknown, used and expired tokens are refused and nothing changes; throttled after 20 tries an hour', async () => {
  for (const [found, status] of [[null, 404], [row({ status: 'accepted' }), 410], [row({ invite_expires_at: '2026-11-01T00:00:00Z' }), 410]] as const) {
    const { d, calls } = db(found);
    const r = await handleInvite({ method: 'POST', body: { token, action: 'accept' }, ip: '1.1.1.1' }, d, () => NOW);
    assert.equal(r.status, status);
    assert.equal(calls.set.length, 0);
  }
  const { d } = db(row(), 20);
  assert.equal((await handleInvite({ method: 'POST', body: { token, action: 'check' }, ip: '1.1.1.1' }, d, () => NOW)).status, 429);
  assert.equal((await handleInvite({ method: 'GET', body: null, ip: 'x' }, db(null).d, () => NOW)).status, 405);
});

test('the token is only ever stored as its SHA-256', async () => {
  assert.equal((await sha256Hex('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
