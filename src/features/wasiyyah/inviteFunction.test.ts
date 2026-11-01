import { handleInvite, type InviteDb } from '../../../supabase/functions/_shared/handler';
import { judge, MAX_ATTEMPTS_PER_HOUR, parseBody, sha256Hex, TOKEN_PATTERN, type ContactRow } from '../../../supabase/functions/_shared/invite';

const TOKEN = 'A'.repeat(43);
const NOW = new Date('2026-11-10T12:00:00Z');
const future = '2026-11-15T00:00:00Z';
const past = '2026-11-01T00:00:00Z';

function fakeDb(row: ContactRow | null, attempts = 0) {
  const calls = { recorded: [] as string[], statuses: [] as [string, string][], lookedUp: [] as string[] };
  const db: InviteDb = {
    countAttempts: async () => attempts,
    recordAttempt: async (hash) => void calls.recorded.push(hash),
    findByTokenHash: async (hash) => (calls.lookedUp.push(hash), row),
    setStatus: async (id, status) => void calls.statuses.push([id, status]),
  };
  return { db, calls };
}
const invited = (over: Partial<ContactRow> = {}): ContactRow => ({ id: 'c1', status: 'invited', invite_expires_at: future, inviter_name: 'Aisha', ...over });
const post = (body: unknown, ip = '1.2.3.4') => ({ method: 'POST', body, ip });

describe('hashing', () => {
  it('is SHA-256 in lowercase hex (the app and the database must agree on this exactly)', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect((await sha256Hex(TOKEN))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('request parsing', () => {
  it('accepts only a well-formed token and a known action', () => {
    expect(parseBody({ token: TOKEN, action: 'accept' })).toEqual({ token: TOKEN, action: 'accept' });
    for (const bad of [null, 'x', 42, {}, { token: TOKEN }, { token: TOKEN, action: 'delete' }, { token: 'short', action: 'accept' },
      { token: TOKEN + 'A', action: 'accept' }, { token: 'A'.repeat(42) + '!', action: 'accept' }, { token: 123, action: 'accept' }]) {
      expect(parseBody(bad)).toBeNull();
    }
    expect(TOKEN_PATTERN.test('A'.repeat(43))).toBe(true);
  });
});

describe('judging an invite', () => {
  it('is usable once, before it expires, and only while still invited', () => {
    expect(judge(invited(), NOW)).toBe('ok');
    expect(judge(null, NOW)).toBe('invalid');
    expect(judge(invited({ invite_expires_at: past }), NOW)).toBe('expired');
    expect(judge(invited({ invite_expires_at: NOW.toISOString() }), NOW)).toBe('expired'); // the instant it expires
    expect(judge(invited({ status: 'accepted' }), NOW)).toBe('used');
    expect(judge(invited({ status: 'revoked' }), NOW)).toBe('used');
  });
});

describe('invite endpoint', () => {
  it('checking an invite reveals only the name the owner chose to show', async () => {
    const { db, calls } = fakeDb(invited());
    const res = await handleInvite(post({ token: TOKEN, action: 'check' }), db, () => NOW);
    expect(res).toEqual({ status: 200, json: { ok: true, inviter_name: 'Aisha' } });
    expect(calls.statuses).toEqual([]); // a check changes nothing
  });
  it('looks the invite up by hash, never by the raw token', async () => {
    const { db, calls } = fakeDb(invited());
    await handleInvite(post({ token: TOKEN, action: 'check' }), db, () => NOW);
    expect(calls.lookedUp).toEqual([await sha256Hex(TOKEN)]);
    expect(JSON.stringify(calls)).not.toContain(TOKEN);
  });

  it('accepting marks the contact accepted', async () => {
    const { db, calls } = fakeDb(invited());
    expect(await handleInvite(post({ token: TOKEN, action: 'accept' }), db, () => NOW)).toEqual({ status: 200, json: { ok: true, state: 'accepted' } });
    expect(calls.statuses).toEqual([['c1', 'accepted']]);
  });
  it('declining revokes the invite', async () => {
    const { db, calls } = fakeDb(invited());
    expect(await handleInvite(post({ token: TOKEN, action: 'decline' }), db, () => NOW)).toEqual({ status: 200, json: { ok: true, state: 'declined' } });
    expect(calls.statuses).toEqual([['c1', 'revoked']]);
  });

  it.each([
    ['unknown token', null, 404, 'invalid'],
    ['expired invite', invited({ invite_expires_at: past }), 410, 'expired'],
    ['already accepted', invited({ status: 'accepted' }), 410, 'used'],
    ['revoked by the owner', invited({ status: 'revoked' }), 410, 'used'],
  ])('refuses an %s and changes nothing', async (_name, row, status, error) => {
    const { db, calls } = fakeDb(row as ContactRow | null);
    for (const action of ['check', 'accept', 'decline']) {
      expect(await handleInvite(post({ token: TOKEN, action }), db, () => NOW)).toEqual({ status, json: { ok: false, error } });
    }
    expect(calls.statuses).toEqual([]);
  });

  it('rejects malformed requests and wrong methods without touching the invite', async () => {
    const { db, calls } = fakeDb(invited());
    expect((await handleInvite(post({ token: 'nope', action: 'accept' }), db, () => NOW)).status).toBe(400);
    expect((await handleInvite(post(null), db, () => NOW)).status).toBe(400);
    expect((await handleInvite({ method: 'GET', body: null, ip: '1.1.1.1' }, db, () => NOW)).status).toBe(405);
    expect(calls.statuses).toEqual([]);
    expect(calls.lookedUp).toEqual([]);
  });

  it('throttles an address after too many attempts in an hour', async () => {
    const { db, calls } = fakeDb(invited(), MAX_ATTEMPTS_PER_HOUR);
    expect(await handleInvite(post({ token: TOKEN, action: 'accept' }), db, () => NOW)).toEqual({ status: 429, json: { ok: false, error: 'too_many_attempts' } });
    expect(calls.statuses).toEqual([]);
    expect(calls.lookedUp).toEqual([]);
    const ok = fakeDb(invited(), MAX_ATTEMPTS_PER_HOUR - 1);
    expect((await handleInvite(post({ token: TOKEN, action: 'check' }), ok.db, () => NOW)).status).toBe(200);
  });
  it('records each attempt against a hash of the address, never the address itself', async () => {
    const { db, calls } = fakeDb(null);
    await handleInvite(post({ token: TOKEN, action: 'check' }, '203.0.113.9'), db, () => NOW);
    expect(calls.recorded).toHaveLength(1);
    expect(calls.recorded[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(calls)).not.toContain('203.0.113.9');
  });
  it('counts malformed requests too, so probing cannot be free', async () => {
    const { db, calls } = fakeDb(null);
    await handleInvite(post('garbage'), db, () => NOW);
    expect(calls.recorded).toHaveLength(1);
  });
});
