import { addMonths } from '@/lib/dates';
import type { Debt, DebtPayment } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (iso: string) => iso.slice(0, 7);
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export interface AutoInstalment { debt_id: string; period: string; paid_on: string; amount_laari: number }

/**
 * Instalments the lender has already taken from salary that the app has not yet written down. A debt marked
 * "deducted from salary" gets one payment per month on its due day, from the month it started, for the instalment (or
 * what is left, for the last one), up to today. A month where the person already recorded the instalment by hand is
 * skipped, so nothing is ever counted twice. Writing them down is safe to repeat: each is for one month of one debt.
 */
export function dueInstalments(debts: readonly Debt[], payments: readonly DebtPayment[], today: string): AutoInstalment[] {
  const out: AutoInstalment[] = [];
  for (const d of debts) {
    if (!d.auto_deducted || !d.due_day || !d.started_on || d.min_payment_laari <= 0 || d.balance_laari <= 0) continue;
    const mine = payments.filter((p) => p.debt_id === d.id);
    const done = new Set(mine.filter((p) => p.source === 'auto' && p.period).map((p) => monthKey(p.period as string)));
    let left = d.balance_laari;
    let cursor = `${monthKey(d.started_on)}-01`;
    for (let i = 0; i < 600 && left > 0; i++, cursor = addMonths(cursor, 1)) {
      const [y, m] = cursor.split('-').map(Number);
      const due = `${y}-${pad(m)}-${pad(Math.min(d.due_day, lastDay(y, m)))}`;
      if (due > today) break;
      if (due < d.started_on || done.has(monthKey(due))) continue;
      const byHand = mine.filter((p) => p.source !== 'auto' && monthKey(p.paid_on) === monthKey(due)).reduce((s, p) => s + p.amount_laari, 0);
      if (byHand >= d.min_payment_laari) continue;
      const amount = Math.min(d.min_payment_laari, left);
      out.push({ debt_id: d.id, period: cursor, paid_on: due, amount_laari: amount });
      left -= amount;
    }
  }
  return out;
}
