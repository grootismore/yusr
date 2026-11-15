/** The 42 days (6 weeks, Monday first) shown for a month, as YYYY-MM-DD, with whether each falls in that month. */
export function monthGrid(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, 1 - lead + i));
    return { iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month - 1 };
  });
}

/** Year and month (1-12) moved by n months. */
export function shiftMonth(year: number, month: number, n: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + n, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
