export type DueState = 'none' | 'paid' | 'ok' | 'due_soon' | 'overdue';
export const DUE_SOON_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, '0');

/** Due date in the month of `todayIso`, with day 31 clamped to short months. */
export function dueDateThisMonth(dueDay: number, todayIso: string): string {
  const [y, m] = todayIso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(Math.min(dueDay, last))}`;
}

const dayNumber = (iso: string): number => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

/**
 * Where a debt stands this month. A payment of at least the minimum (or any payment, when there is
 * no minimum) settles the month. Otherwise: overdue once the due day has passed, due soon within a
 * week of it. `days` is how many days late or how many until due.
 */
export function dueStatus(a: { dueDay: number | null; today: string; paidThisMonth: number; minPayment: number; balance: number }): { state: DueState; days: number } {
  if (a.balance <= 0) return { state: 'paid', days: 0 };
  if (a.dueDay === null) return { state: 'none', days: 0 };
  if (a.paidThisMonth > 0 && a.paidThisMonth >= a.minPayment) return { state: 'ok', days: 0 };
  const diff = dayNumber(dueDateThisMonth(a.dueDay, a.today)) - dayNumber(a.today);
  if (diff < 0) return { state: 'overdue', days: -diff };
  if (diff <= DUE_SOON_DAYS) return { state: 'due_soon', days: diff };
  return { state: 'ok', days: diff };
}
