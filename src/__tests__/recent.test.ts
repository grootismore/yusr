import type { Expense } from '@/data/types';
import type { HouseholdEntry } from '@/features/household/logic';
import { recentRows } from '@/features/household/recent';

const own = (id: string, spent_at: string) => ({ id, spent_at } as Expense);
const shared = (id: string, entry_date: string, kind: 'expense' | 'income' = 'expense') => ({ id, entry_date, kind } as HouseholdEntry);

describe('recentRows', () => {
  it('puts your own and shared expenses together, newest day first', () => {
    const r = recentRows([own('a', '2026-11-03'), own('b', '2026-11-01')], [shared('s1', '2026-11-02'), shared('s2', '2026-11-04')], 10);
    expect(r.map((x) => (x.kind === 'own' ? x.expense.id : x.entry.id))).toEqual(['s2', 'a', 's1', 'b']);
  });
  it('keeps the limit and leaves out shared income', () => {
    const r = recentRows([own('a', '2026-11-03')], [shared('i', '2026-11-05', 'income'), shared('s', '2026-11-02')], 2);
    expect(r).toHaveLength(2);
    expect(r.some((x) => x.kind === 'shared' && x.entry.id === 'i')).toBe(false);
  });
  it('works without a household', () => {
    expect(recentRows([own('a', '2026-11-03')], undefined, 6)).toHaveLength(1);
  });
});
