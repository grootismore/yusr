import { addMonths } from '@/lib/dates';

/** The last `n` months ending at `endMonth` (YYYY-MM-01), oldest first. */
export const lastMonths = (endMonth: string, n: number): string[] => Array.from({ length: n }, (_, i) => addMonths(endMonth, i - (n - 1)));

/** Sum amounts per month. `date` is YYYY-MM-DD; rows outside `months` are ignored. */
export function sumByMonth(rows: readonly { date: string; laari: number }[], months: readonly string[]): number[] {
  const index = new Map(months.map((m, i) => [m.slice(0, 7), i]));
  const out = months.map(() => 0);
  for (const r of rows) {
    const i = index.get(r.date.slice(0, 7));
    if (i !== undefined) out[i] += r.laari;
  }
  return out;
}

/** Average over the months that have any spending (an empty month before they started is not a zero month). */
export function averageSpend(spend: readonly number[]): number {
  const active = spend.filter((n) => n > 0);
  return active.length ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
}

/** Bar height as a whole percent of the tallest bar (at least 2% when there is something, so it stays visible). */
export const barPercent = (value: number, max: number): number => (max <= 0 || value <= 0 ? 0 : Math.max(2, Math.round((value * 100) / max)));
