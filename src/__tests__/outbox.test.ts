import { QueryClient } from '@tanstack/react-query';
import { applyOptimistic, opNameOf, withIds } from '@/data/queued';
import * as api from '@/data/api';
import { clearOutbox, enqueue, flushOutbox, pendingCount } from '@/lib/outbox';

jest.mock('expo-file-system', () => {
  const disk = new Map<string, string>();
  class File { constructor(...p: unknown[]) { this.p = p.map(String).join('/'); } p: string; get exists() { return disk.has(this.p); } create() { disk.set(this.p, ''); } async write(t: string) { disk.set(this.p, t); } async text() { return disk.get(this.p) ?? ''; } delete() { disk.delete(this.p); } }
  return { File, Paths: { document: 'doc' } };
});
let mockN = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `id-${++mockN}` }));
jest.mock('@/data/api', () => ({ addExpense: jest.fn(), addIncome: jest.fn(), addIncomeSplit: jest.fn(), logGiving: jest.fn() }));

beforeEach(async () => { await clearOutbox(); });

describe('saving offline', () => {
  it('sends in order and stops at the first request that cannot get through', async () => {
    await enqueue('a', 'addExpense', { n: 1 });
    await enqueue('b', 'addExpense', { n: 2 });
    const seen: unknown[] = [];
    const r1 = await flushOutbox(async (_op, args) => { seen.push(args); if ((args as { n: number }).n === 2) throw new Error('TypeError: Network request failed'); });
    expect(r1).toEqual({ sent: 1, failed: 0 });
    expect(pendingCount()).toBe(1); // the second waits
    const r2 = await flushOutbox(async () => undefined);
    expect(r2.sent).toBe(1);
    expect(pendingCount()).toBe(0);
  });
  it('a duplicate means it was already saved; any other refusal drops it without blocking the rest', async () => {
    await enqueue('a', 'x', 1); await enqueue('b', 'x', 2); await enqueue('c', 'x', 3);
    const r = await flushOutbox(async (_o, args) => {
      if (args === 1) throw new Error('duplicate key value violates unique constraint');
      if (args === 2) throw new Error('new row violates row-level security policy');
    });
    expect(r).toEqual({ sent: 2, failed: 1 });
    expect(pendingCount()).toBe(0);
  });
  it('keeps an entry while the session is not back', async () => {
    await enqueue('a', 'x', 1);
    const r = await flushOutbox(async () => { throw new Error('Not signed in'); });
    expect(r).toEqual({ sent: 0, failed: 0 });
    expect(pendingCount()).toBe(1);
  });
  it('gives each save its own id up front, so a resend cannot make a second one', () => {
    const e = withIds('addExpense', { amount_laari: 100 } as Record<string, unknown>) as unknown as { id: string };
    expect(e.id).toMatch(/^id-/);
    expect(withIds('addExpense', e)).toEqual(e); // keeps the id it already has
    const s = withIds('addIncomeSplit', { rows: [{}, {}] } as Record<string, unknown>) as unknown as { ids: string[] };
    expect(s.ids).toHaveLength(2);
    expect(opNameOf(api.addExpense)).toBe('addExpense');
    expect(opNameOf(() => undefined)).toBeNull();
  });
  it('shows a saved-offline expense in this month\'s list straight away', () => {
    const qc = new QueryClient();
    qc.setQueryData(['expenses', '2026-11-01'], []);
    applyOptimistic(qc, 'addExpense', { id: 'x1', amount_laari: 5000, currency: 'MVR', fx_rate_to_mvr: '1', category_id: null, merchant: 'Cafe', spent_at: '2026-11-15', note: null });
    const rows = qc.getQueryData<{ id: string; mvr_laari: number }[]>(['expenses', '2026-11-01']);
    expect(rows?.[0]).toMatchObject({ id: 'x1', mvr_laari: 5000 });
  });
});
