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
jest.mock('@/data/api', () => ({ addExpense: jest.fn(), addIncome: jest.fn(), addIncomeSplit: jest.fn(), logGiving: jest.fn(), addDebtPayment: jest.fn(), updateExpense: jest.fn(), deleteExpense: jest.fn(), updateSadaqah: jest.fn(), deleteGiving: jest.fn(), updateIncome: jest.fn(), deleteIncome: jest.fn(), updateDebtPayment: jest.fn(), deleteDebtPayment: jest.fn(), deleteConversion: jest.fn(), setBudget: jest.fn(), clearBudget: jest.fn(), addDebt: jest.fn(), updateDebt: jest.fn(), deleteDebt: jest.fn(), addPool: jest.fn(), updatePool: jest.fn(), endPool: jest.fn(), logPoolPayment: jest.fn() }));

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
  it('editing and deleting offline change the lists straight away, and ids are left alone', () => {
    const qc = new QueryClient();
    const row = (id: string, amount_laari: number) => ({ id, amount_laari, currency: 'MVR', fx_rate_to_mvr: 1, mvr_laari: amount_laari, category_id: null, merchant: null, spent_at: '2026-11-15', note: null, source: 'manual', receipt_id: null });
    qc.setQueryData(['expenses', '2026-11-01'], [row('a', 1000), row('b', 2000)]);
    expect(withIds('deleteExpense', 'a')).toBe('a'); // not a create: the id is not touched
    applyOptimistic(qc, 'updateExpense', { id: 'a', e: { amount_laari: 1500, currency: 'MVR', fx_rate_to_mvr: '1', category_id: null, merchant: 'X', spent_at: '2026-11-15', note: null } });
    expect(qc.getQueryData<{ id: string; mvr_laari: number }[]>(['expenses', '2026-11-01'])?.[0].mvr_laari).toBe(1500);
    applyOptimistic(qc, 'deleteExpense', 'b');
    expect(qc.getQueryData<{ id: string }[]>(['expenses', '2026-11-01'])?.map((x) => x.id)).toEqual(['a']);
  });
  it('deleting a debt payment puts the amount back on the debt', () => {
    const qc = new QueryClient();
    qc.setQueryData(['debt-payments'], [{ id: 'p1', debt_id: 'd1', amount_laari: 5000, paid_mvr_laari: null, paid_on: '2026-11-01', note: null }]);
    qc.setQueryData(['debts'], [{ id: 'd1', paid_laari: 5000, balance_laari: 95000 }]);
    applyOptimistic(qc, 'deleteDebtPayment', 'p1');
    expect(qc.getQueryData<unknown[]>(['debt-payments'])).toEqual([]);
    expect(qc.getQueryData<{ balance_laari: number; paid_laari: number }[]>(['debts'])?.[0]).toMatchObject({ balance_laari: 100000, paid_laari: 0 });
  });
  it('a limit set offline applies from its month on, and clearing removes it', () => {
    const qc = new QueryClient();
    qc.setQueryData(['budgets', '2026-11-01'], [{ id: 'b1', month: '2026-10-01', category_id: null, limit_laari: 100000 }]);
    qc.setQueryData(['budgets', '2026-09-01'], []);
    applyOptimistic(qc, 'setBudget', { month: '2026-11-01', categoryId: null, limit: 250000 });
    const nov = qc.getQueryData<{ month: string; limit_laari: number }[]>(['budgets', '2026-11-01']) ?? [];
    expect(nov.find((r) => r.month === '2026-11-01')?.limit_laari).toBe(250000);
    expect(qc.getQueryData<unknown[]>(['budgets', '2026-09-01'])).toEqual([]); // an earlier month is not touched
    applyOptimistic(qc, 'clearBudget', { categoryId: null });
    expect(qc.getQueryData<unknown[]>(['budgets', '2026-11-01'])).toEqual([]);
  });
  it('a debt added, changed or deleted offline shows at once; deleting takes its payments with it', () => {
    const qc = new QueryClient();
    const input = { lender: 'BML Visa', kind: 'credit_card', opening_balance_laari: 60000, min_payment_laari: 1000, min_pct_bps: 500, currency: 'USD', due_day: 5, interest_bearing: true, interest_rate_bps: 2400, in_register: true, notes: null };
    qc.setQueryData(['debts'], []);
    applyOptimistic(qc, 'addDebt', { id: 'd9', input });
    expect(qc.getQueryData<{ id: string; balance_laari: number }[]>(['debts'])?.[0]).toMatchObject({ id: 'd9', balance_laari: 60000 });
    qc.setQueryData(['debt-payments'], [{ id: 'p', debt_id: 'd9', amount_laari: 1, paid_mvr_laari: null, paid_on: '2026-11-01', note: null }]);
    applyOptimistic(qc, 'deleteDebt', 'd9');
    expect(qc.getQueryData<unknown[]>(['debts'])).toEqual([]);
    expect(qc.getQueryData<unknown[]>(['debt-payments'])).toEqual([]);
  });
  it('a pool contribution saved offline shows as paid and as spending at once', () => {
    const qc = new QueryClient();
    qc.setQueryData(['pool-payments'], []);
    qc.setQueryData(['expenses', '2026-11-01'], []);
    applyOptimistic(qc, 'logPoolPayment', { id: 'pp1', pool_id: 'pool', name: 'Office pool', amount_minor: 100_000, currency: 'MVR', fx_rate_to_mvr: '1', spent_at: '2026-11-05', period: '2026-11-01' });
    expect(qc.getQueryData<{ period: string }[]>(['pool-payments'])?.[0].period).toBe('2026-11-01');
    expect(qc.getQueryData<{ merchant: string }[]>(['expenses', '2026-11-01'])?.[0].merchant).toBe('Office pool');
  });
});
