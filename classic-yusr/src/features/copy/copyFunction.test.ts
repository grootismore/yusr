import {
  checkText,
  constantTimeEqual,
  handleCopy,
  MAX_FAILURES_PER_HOUR,
  sha256Hex,
  tokensOf,
  type CopyDb,
  type CopyRow,
} from '../../../supabase/functions/_shared/copy';

const NOW = new Date('2026-11-10T12:00:00Z');
const SECRET = 'correct horse';

const row = (over: Partial<CopyRow> = {}): CopyRow => ({ surface: 'app', key: 'wasiyyah.events.contact_invited', en: 'You invited {{name}}', dv: 'ތިބޭފުޅުން {{name}} ގޮވާލެއްވި', tokens: ['{{name}}'], needs_review: true, ...over });

function fakeDb(rows: CopyRow[] = [row()], failures = 0) {
  const store = new Map(rows.map((r) => [`${r.surface}:${r.key}`, { ...r }]));
  const calls = { failures: [] as string[], updates: [] as unknown[], inserted: [] as CopyRow[] };
  const db: CopyDb = {
    countFailures: async () => failures,
    recordFailure: async (hash) => void calls.failures.push(hash),
    list: async () => [...store.values()],
    get: async (surface, key) => store.get(`${surface}:${key}`) ?? null,
    update: async (surface, key, patch) => void calls.updates.push({ surface, key, ...patch }),
    insertMissing: async (incoming) => {
      const fresh = incoming.filter((r) => !store.has(`${r.surface}:${r.key}`));
      calls.inserted.push(...fresh);
      return fresh.length;
    },
  };
  return { db, calls };
}
const call = (db: CopyDb, body: unknown, over: { passcode?: string; method?: string; ip?: string; secret?: string } = {}) =>
  handleCopy({ method: over.method ?? 'POST', passcode: over.passcode ?? SECRET, body, ip: over.ip ?? '1.2.3.4' }, db, over.secret ?? SECRET, () => NOW);

describe('placeholders', () => {
  it('finds {{name}} and {name}, ignoring spacing and repeats, in a stable order', () => {
    expect(tokensOf('Hello {{ name }}, {{name}} and {count}')).toEqual(['{count}', '{{name}}']);
    expect(tokensOf('No placeholders here')).toEqual([]);
  });
  it('rejects text that drops, adds or renames a placeholder', () => {
    expect(checkText('You invited {{name}}', ['{{name}}'])).toBeNull();
    expect(checkText('You invited someone', ['{{name}}'])).toBe('placeholders_changed');
    expect(checkText('You invited {{who}}', ['{{name}}'])).toBe('placeholders_changed');
    expect(checkText('Hi {{name}} {{extra}}', ['{{name}}'])).toBe('placeholders_changed');
  });
  it('rejects empty, oversized and control-character text', () => {
    expect(checkText('', [])).toBe('text_empty');
    expect(checkText('   ', [])).toBe('text_empty');
    expect(checkText('x'.repeat(2001), [])).toBe('text_too_long');
    expect(checkText('bad\u0007text', [])).toBe('text_invalid_characters');
    expect(checkText('two\nlines', [])).toBeNull();
    expect(checkText(42, [])).toBe('text_required');
  });
});

describe('constantTimeEqual', () => {
  it('is true only for identical strings of the same length', async () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('access', () => {
  it('only accepts POST', async () => {
    expect((await call(fakeDb().db, { action: 'list' }, { method: 'GET' })).status).toBe(405);
  });
  it('lets nobody in when the passcode secret is not set, even with an empty passcode', async () => {
    const r = await call(fakeDb().db, { action: 'list' }, { secret: '', passcode: '' });
    expect(r.status).toBe(503);
  });
  it('refuses a wrong or empty passcode, and records the failure against a hashed address', async () => {
    const { db, calls } = fakeDb();
    expect((await call(db, { action: 'list' }, { passcode: 'wrong' })).status).toBe(401);
    expect((await call(db, { action: 'list' }, { passcode: '' })).status).toBe(401);
    expect(calls.failures).toHaveLength(2);
    expect(calls.failures[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(calls.failures[0]).not.toContain('1.2.3.4');
  });
  it('throttles one address after too many wrong guesses, even for the right passcode', async () => {
    const { db } = fakeDb([row()], MAX_FAILURES_PER_HOUR);
    expect((await call(db, { action: 'list' })).status).toBe(429);
  });
  it('does not count a correct passcode as a failure', async () => {
    const { db, calls } = fakeDb();
    expect((await call(db, { action: 'list' })).status).toBe(200);
    expect(calls.failures).toEqual([]);
  });
  it('rejects a malformed request after the passcode checks out', async () => {
    expect((await call(fakeDb().db, null)).status).toBe(400);
    expect((await call(fakeDb().db, { action: 'wipe' })).status).toBe(400);
  });
});

describe('list and save', () => {
  it('lists every row', async () => {
    const r = await call(fakeDb([row(), row({ key: 'b' })]).db, { action: 'list' });
    expect((r.json.rows as unknown[]).length).toBe(2);
  });

  it('saves a Dhivehi edit that keeps the placeholder, recording who made it', async () => {
    const { db, calls } = fakeDb();
    const r = await call(db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', dv: 'ތިބޭފުޅުން {{name}} ގޮވާލެއްވި!', editor: '  Aisha   N ' });
    expect(r).toEqual({ status: 200, json: { ok: true, changed: true } });
    expect(calls.updates).toEqual([{ surface: 'app', key: 'wasiyyah.events.contact_invited', dv: 'ތިބޭފުޅުން {{name}} ގޮވާލެއްވި!', updated_by: 'Aisha N' }]);
  });

  it('refuses an edit that drops the placeholder, for either language, and changes nothing', async () => {
    const { db, calls } = fakeDb();
    const dv = await call(db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', dv: 'ގޮވާލެއްވި' });
    expect(dv).toEqual({ status: 400, json: { ok: false, error: 'placeholders_changed', field: 'dv' } });
    const en = await call(db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', en: 'You invited them' });
    expect(en.json).toMatchObject({ error: 'placeholders_changed', field: 'en' });
    expect(calls.updates).toEqual([]);
  });

  it('can edit English as well as Dhivehi', async () => {
    const { db, calls } = fakeDb();
    await call(db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', en: 'You invited {{name}} to Yusr' });
    expect(calls.updates[0]).toMatchObject({ en: 'You invited {{name}} to Yusr' });
  });

  it('marks a string reviewed only when asked', async () => {
    const { db, calls } = fakeDb();
    await call(db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', reviewed: true });
    expect(calls.updates[0]).toMatchObject({ needs_review: false });
    const none = fakeDb();
    await call(none.db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', dv: 'ތިބޭފުޅުން {{name}} ގޮވާލެއްވި!' });
    expect(none.calls.updates[0]).not.toHaveProperty('needs_review');
  });

  it('does nothing, and says so, when nothing changed', async () => {
    const { db, calls } = fakeDb();
    const r = await call(db, { action: 'save', surface: 'app', key: 'wasiyyah.events.contact_invited', dv: row().dv, en: row().en });
    expect(r.json).toEqual({ ok: true, changed: false });
    expect(calls.updates).toEqual([]);
  });

  it('refuses an unknown string or surface', async () => {
    expect((await call(fakeDb().db, { action: 'save', surface: 'app', key: 'nope', dv: 'x' })).status).toBe(404);
    expect((await call(fakeDb().db, { action: 'save', surface: 'legal', key: 'x', dv: 'x' })).status).toBe(400);
  });
});

describe('seed', () => {
  it('adds only the strings that are missing and never overwrites an edit', async () => {
    const { db, calls } = fakeDb();
    const r = await call(db, {
      action: 'seed',
      rows: [
        { surface: 'app', key: 'wasiyyah.events.contact_invited', en: 'OVERWRITE {{name}}', dv: 'x {{name}}' },
        { surface: 'app', key: 'home.income', en: 'Income', dv: 'އާމްދަނީ', needs_review: true },
      ],
    });
    expect(r.json).toEqual({ ok: true, added: 1, skipped: 1, rejected: [] });
    expect(calls.inserted).toEqual([{ surface: 'app', key: 'home.income', en: 'Income', dv: 'އާމްދަނީ', tokens: [], needs_review: true }]);
  });

  it('works out the placeholders from the English and rejects a row whose Dhivehi disagrees', async () => {
    const { db, calls } = fakeDb([]);
    const r = await call(db, {
      action: 'seed',
      rows: [
        { surface: 'invite', key: 'invitedBy', en: '{name} has invited you', dv: '{name} ގޮވާލެއްވި' },
        { surface: 'invite', key: 'broken', en: '{name} has invited you', dv: 'ގޮވާލެއްވި' },
        { surface: 'legal', key: 'x', en: 'a', dv: 'b' },
      ],
    });
    expect(r.json).toMatchObject({ added: 1, rejected: ['invite:broken', 'x'] });
    expect(calls.inserted[0].tokens).toEqual(['{name}']);
  });

  it('refuses an empty or oversized batch', async () => {
    expect((await call(fakeDb().db, { action: 'seed', rows: [] })).status).toBe(400);
    expect((await call(fakeDb().db, { action: 'seed', rows: new Array(1501).fill({}) })).status).toBe(400);
  });
});
