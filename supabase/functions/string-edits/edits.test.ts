// Run: node --experimental-strip-types --test supabase/functions/string-edits/edits.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleEdits, type Deps } from './handler.ts';

const mk = (editorKey: string | null = 'k') => {
  const saved: unknown[] = [], removed: unknown[] = [];
  const deps: Deps = { editorKey: editorKey ?? undefined, list: async () => [], save: async (e) => { saved.push(e); }, remove: async (k, l) => { removed.push([k, l]); } };
  return { deps, saved, removed };
};

test('wrong, missing or unset key is refused', async () => {
  assert.equal((await handleEdits({ method: 'GET', key: 'x', body: null }, mk().deps)).status, 401);
  assert.equal((await handleEdits({ method: 'GET', key: null, body: null }, mk().deps)).status, 401);
  assert.equal((await handleEdits({ method: 'GET', key: 'k', body: null }, mk(null).deps)).status, 401);
});
test('saves, resets and validates', async () => {
  const m = mk();
  assert.equal((await handleEdits({ method: 'POST', key: 'k', body: { key: 'plus.title', lang: 'dv', value: 'ޕްލަސް' } }, m.deps)).status, 200);
  assert.equal(m.saved.length, 1);
  assert.equal((await handleEdits({ method: 'POST', key: 'k', body: { key: 'plus.title', lang: 'en', value: null } }, m.deps)).status, 200);
  assert.deepEqual(m.removed, [['plus.title', 'en']]);
  assert.equal((await handleEdits({ method: 'POST', key: 'k', body: { key: 'bad key', lang: 'dv', value: 'x' } }, m.deps)).status, 400);
  assert.equal((await handleEdits({ method: 'POST', key: 'k', body: { key: 'a.b', lang: 'fr', value: 'x' } }, m.deps)).status, 400);
});
