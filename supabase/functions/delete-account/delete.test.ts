// Run: node --experimental-strip-types --test supabase/functions/delete-account/delete.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleDelete, type DeleteDeps } from './handler.ts';

function deps(o: { user?: string | null; failFiles?: boolean } = {}) {
  const calls: string[] = [];
  const d: DeleteDeps = {
    getUserId: async (h) => (h === 'Bearer ok' ? (o.user === undefined ? 'u1' : o.user) : null),
    removeFiles: async (u) => { if (o.failFiles) throw new Error('x'); calls.push(`files:${u}`); },
    deleteUser: async (u) => void calls.push(`user:${u}`),
  };
  return { d, calls };
}
const req = (o: object = {}) => ({ method: 'POST', authHeader: 'Bearer ok', body: { confirm: 'delete' }, ...o });

test('deletes the caller\'s files then the caller\'s account, using the id from the token', async () => {
  const { d, calls } = deps();
  assert.equal((await handleDelete(req({ body: { confirm: 'delete', userId: 'someone-else' } }), d)).status, 200);
  assert.deepEqual(calls, ['files:u1', 'user:u1']);
});

test('no token, wrong method or no explicit confirmation: nothing is touched', async () => {
  for (const [r, status] of [[req({ authHeader: 'Bearer bad' }), 401], [req({ method: 'GET' }), 405], [req({ body: {} }), 400], [req({ body: null }), 400]] as const) {
    const { d, calls } = deps();
    assert.equal((await handleDelete(r, d)).status, status);
    assert.deepEqual(calls, []);
  }
});

test('if the files cannot be removed the account is kept so the person can retry', async () => {
  const { d, calls } = deps({ failFiles: true });
  assert.equal((await handleDelete(req(), d)).status, 500);
  assert.deepEqual(calls, []);
});
