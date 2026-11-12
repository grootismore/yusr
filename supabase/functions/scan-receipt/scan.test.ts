// Run: node --experimental-strip-types --test supabase/functions/scan-receipt/scan.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraft, monthStart, parseDate, parseMoney } from './logic.ts';
import { handleScan, type ScanDeps } from './handler.ts';

const good = {
  is_receipt: true, merchant: 'STO Mart', date: '03/11/2026', currency: 'MVR', total: '108.00', gst: '8.00',
  service_charge: null, discount: null, prices_include_gst: false,
  items: [{ name: 'Rice', qty: '1', unit_price: '60.00', total: '60.00' }, { name: 'ކިރު', qty: '2', unit_price: '20.00', total: '40.00' }],
  category: 'food-groceries',
  confidence: { merchant: 0.9, date: 0.9, currency: 0.9, total: 0.95, gst: 0.9, items: 0.9, category: 0.8 },
};
const NOW = new Date('2026-11-13T05:00:00Z');

test('parseMoney is exact and tolerant', () => {
  assert.equal(parseMoney('1,234.50'), 123450);
  assert.equal(parseMoney('MVR 12.5'), 1250);
  assert.equal(parseMoney('12,50'), 1250);
  assert.equal(parseMoney('1,234'), 123400);
  assert.equal(parseMoney('0.29'), 29);
  assert.equal(parseMoney('19.995'), 2000);
  assert.equal(parseMoney('abc'), null);
  assert.equal(parseMoney(null), null);
});

test('dates are day-first', () => {
  assert.equal(parseDate('03/04/2026'), '2026-04-03');
  assert.equal(parseDate('3-4-26'), '2026-04-03');
  assert.equal(parseDate('2026-04-03'), '2026-04-03');
  assert.equal(parseDate('31/02/2026'), null);
});

test('quota month uses Maldives time', () => {
  assert.equal(monthStart(new Date('2026-10-31T20:00:00Z')), '2026-11-01'); // 01:00 on 1 Nov in Malé
  assert.equal(monthStart(new Date('2026-10-31T18:00:00Z')), '2026-10-01');
});

test('good receipt: GST stays its own field and totals match', () => {
  const o = buildDraft(good, NOW);
  assert.ok(o.ok);
  assert.equal(o.draft.total_laari, 10800);
  assert.equal(o.draft.gst_laari, 800);
  assert.equal(o.draft.date, '2026-11-03');
  assert.equal(o.draft.totals_mismatch, false);
});

test('items + GST not matching the total is flagged', () => {
  const o = buildDraft({ ...good, total: '150.00' }, NOW);
  assert.ok(o.ok);
  assert.equal(o.draft.totals_mismatch, true);
  assert.ok(o.draft.warnings.includes('items_total_mismatch'));
});

test('GST-inclusive prices are checked without adding GST', () => {
  const o = buildDraft({ ...good, total: '100.00', prices_include_gst: true }, NOW);
  assert.ok(o.ok && !o.draft.totals_mismatch);
});

test('unreadable and not-a-receipt are not usable; unknown category falls back to other', () => {
  assert.equal(buildDraft({ ...good, total: null }, NOW).ok, false);
  assert.equal(buildDraft({ ...good, is_receipt: false }, NOW).ok, false);
  const o = buildDraft({ ...good, category: 'pizza', currency: null }, NOW);
  assert.ok(o.ok && o.draft.category_slug === 'other' && o.draft.currency === 'MVR');
});

// ---- handler: quota behaviour
function deps(over: Partial<ScanDeps> = {}) {
  const calls = { reserve: 0, refund: 0, extract: 0, deleted: 0 };
  const d: ScanDeps = {
    getUserId: async (h) => (h === 'Bearer ok' ? 'u1' : null),
    reserveScan: async () => (calls.reserve++, 4),
    refundScan: async () => void calls.refund++,
    download: async () => ({ bytes: new Uint8Array(1000), mimeType: 'image/jpeg' }),
    deleteImage: async () => (calls.deleted++, true),
    keepImages: async () => false,
    extract: async () => (calls.extract++, good),
    now: () => NOW,
    ...over,
  };
  return { d, calls };
}
const req = (over: object = {}) => ({ method: 'POST', authHeader: 'Bearer ok', body: { image_path: 'u1/a.jpg' }, ...over });

test('success returns a draft, keeps the quota, deletes the image by default', async () => {
  const { d, calls } = deps();
  const r = await handleScan(req(), d);
  assert.equal(r.status, 200);
  assert.equal(r.json.scans_left, 6);
  assert.deepEqual([calls.refund, calls.deleted], [0, 1]);
});

test('opt-in keeps the image', async () => {
  const { d, calls } = deps({ keepImages: async () => true });
  const r = await handleScan(req(), d);
  assert.equal(r.json.image_deleted, false);
  assert.equal(calls.deleted, 0);
});

test('failed scan refunds the quota', async () => {
  const { d, calls } = deps({ extract: async () => { throw new Error('boom'); } });
  const r = await handleScan(req(), d);
  assert.equal(r.status, 502);
  assert.equal(calls.refund, 1);
});

test('unreadable receipt refunds the quota and keeps the image', async () => {
  const { d, calls } = deps({ extract: async () => ({ ...good, total: null }) });
  const r = await handleScan(req(), d);
  assert.equal(r.status, 422);
  assert.deepEqual([calls.refund, calls.deleted], [1, 0]);
});

test('over the limit: 429 and the model is never called', async () => {
  const { d, calls } = deps({ reserveScan: async () => null });
  const r = await handleScan(req(), d);
  assert.equal(r.status, 429);
  assert.deepEqual([calls.extract, calls.refund], [0, 0]);
});

test('bad auth, other users paths and traversal never reach quota or model', async () => {
  for (const [r, status] of [
    [req({ authHeader: 'Bearer bad' }), 401],
    [req({ body: { image_path: 'u2/a.jpg' } }), 400],
    [req({ body: { image_path: 'u1/../u2/a.jpg' } }), 400],
    [req({ body: null }), 400],
    [req({ method: 'GET' }), 405],
  ] as const) {
    const { d, calls } = deps();
    assert.equal((await handleScan(r, d)).status, status);
    assert.deepEqual([calls.reserve, calls.extract], [0, 0]);
  }
});

test('missing image refunds', async () => {
  const { d, calls } = deps({ download: async () => null });
  assert.equal((await handleScan(req(), d)).status, 404);
  assert.equal(calls.refund, 1);
});
