import type { Expense } from '@/data/types';
import type { HouseholdEntry } from './logic';

export type RecentRow = { kind: 'own'; date: string; expense: Expense } | { kind: 'shared'; date: string; entry: HouseholdEntry };

/** Your own expenses and the shared pot's expenses together, newest day first, at most `limit` of them. */
export function recentRows(expenses: readonly Expense[], shared: readonly HouseholdEntry[] | undefined, limit: number): RecentRow[] {
  const rows: RecentRow[] = [
    ...expenses.map((expense) => ({ kind: 'own' as const, date: expense.spent_at, expense })),
    ...(shared ?? []).filter((e) => e.kind === 'expense').map((entry) => ({ kind: 'shared' as const, date: entry.entry_date, entry })),
  ];
  // Stable sort: on the same day, your own entries stay in the order they came in, then the shared ones.
  return rows.map((r, i) => [r, i] as const).sort((a, b) => (a[0].date === b[0].date ? a[1] - b[1] : a[0].date < b[0].date ? 1 : -1)).map(([r]) => r).slice(0, limit);
}
