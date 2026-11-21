export interface BudgetRow { id: string; month: string; category_id: string | null; limit_laari: number }

/** Limits carry forward: for each category (null = whole month) the latest row at or before `month` applies. */
export function effectiveBudgets(rows: readonly BudgetRow[], month: string): Map<string | null, number> {
  const best = new Map<string | null, BudgetRow>();
  for (const r of rows) {
    if (r.month > month) continue;
    const cur = best.get(r.category_id);
    if (!cur || r.month > cur.month) best.set(r.category_id, r);
  }
  return new Map([...best].map(([k, r]) => [k, r.limit_laari]));
}

export type BudgetState = 'none' | 'ok' | 'near' | 'over';
export const NEAR_LIMIT = 0.8;

/** over: spent above the limit. near: 80% or more. Anything else is ok. */
export function budgetState(spent: number, limit: number | undefined): BudgetState {
  if (!limit) return 'none';
  if (spent > limit) return 'over';
  return spent >= limit * NEAR_LIMIT ? 'near' : 'ok';
}

/** Whole percent of the limit used, capped at 100 for the bar. */
export const percentUsed = (spent: number, limit: number): number => Math.min(100, Math.floor((spent * 100) / limit));

/** Days left in the month of `todayIso` (YYYY-MM-DD), counting today. */
export function daysLeftInMonth(todayIso: string): number {
  const y = Number(todayIso.slice(0, 4)), m = Number(todayIso.slice(5, 7)), d = Number(todayIso.slice(8, 10));
  return new Date(Date.UTC(y, m, 0)).getUTCDate() - d + 1;
}

/** What is left of a month's budget, and a fair share of it for each remaining day (integer laari, rounded down). */
export function dailyAllowance(spent: number, limit: number, todayIso: string): { left: number; days: number; perDay: number } {
  const left = Math.max(0, limit - spent);
  const days = daysLeftInMonth(todayIso);
  return { left, days, perDay: Math.floor(left / days) };
}
