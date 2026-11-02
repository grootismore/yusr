import { add, subtract, sum } from '@/lib/money';
import { currentBalance, nextDueDate, paidInMonth } from '@/features/debts/logic';
import type { Debt } from '@/features/debts/types';
import { addDays } from '@/features/giving/hijri';
import { commitmentStatus } from '@/features/giving/schedule';
import type { Commitment } from '@/features/giving/types';
import { dueDatesBetween } from './recurring';
import { monthOf, monthSummary } from './logic';
import type { RecurringItem, Transaction } from './types';

export interface SafeToSpend {
  /** What came in this month so far. */
  income: number;
  /** What went out this month so far (expenses and giving). */
  spent: number;
  /** Still to be set aside for the rest of this month, in the PRD's order. */
  reservedDebts: number;
  reservedGiving: number;
  reservedBills: number;
  /** income - spent - everything reserved. Can be negative. */
  safeToSpend: number;
}

const lastDayOfMonth = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

/**
 * "Safe to spend" for the current month (PRD §3.4), in the PRD's reserve order:
 *   income received so far
 *   - spent so far
 *   - what is still due this month for debt minimums, giving commitments and fixed bills
 * Guidance only: it ignores balances carried from earlier months and income not yet received.
 */
export function safeToSpend(input: {
  today: string;
  transactions: readonly Transaction[];
  debts: readonly Debt[];
  commitments: readonly Commitment[];
  recurring: readonly RecurringItem[];
  hijriAdjustment?: number;
}): SafeToSpend {
  const { today, transactions, debts, commitments, recurring, hijriAdjustment = 0 } = input;
  const month = monthOf(today);
  const monthEnd = lastDayOfMonth(month);
  const summary = monthSummary(transactions, month);
  const spent = add(summary.expense, summary.giving);

  // 1. Debt minimums not yet covered this month (for debts still owing and due by month end).
  const reservedDebts = sum(
    debts
      .filter((d) => d.deleted_at === null && d.min_payment_laari > 0 && currentBalance(d, transactions) > 0)
      .map((d) => {
        const stillToPay = subtract(d.min_payment_laari, paidInMonth(d.id, transactions, month));
        return Math.min(Math.max(0, stillToPay), currentBalance(d, transactions));
      }),
  );

  // 2. Giving commitments falling due in the rest of this month and not yet done.
  const reservedGiving = sum(
    commitments
      .filter((c) => c.deleted_at === null && c.active)
      .map((c) => {
        if (c.schedule === 'weekly_friday') {
          // Each remaining Friday this month that has not been given.
          let total = 0;
          for (let iso = today; iso <= monthEnd; iso = addDays(iso, 1)) {
            if (new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), 12).getDay() !== 5) continue;
            const status = commitmentStatus(c, transactions, iso, hijriAdjustment);
            if (!status.done) total = add(total, c.amount_laari);
          }
          return total;
        }
        const status = commitmentStatus(c, transactions, today, hijriAdjustment);
        const o = status.occurrence;
        if (!o || status.done) return 0;
        // Counts if its window overlaps what is left of this month.
        return o.dueOn <= monthEnd && o.end >= today ? c.amount_laari : 0;
      }),
  );

  // 3. Fixed bills (recurring expenses) still due this month and not yet logged.
  const reservedBills = sum(
    recurring
      .filter((r) => r.deleted_at === null && r.active && r.kind === 'expense')
      .map((r) => {
        // From the 1st: a bill whose date has passed but was never logged is still owed this month.
        const unlogged = dueDatesBetween(r, `${month}-01`, monthEnd).length;
        return unlogged * r.amount_laari;
      }),
  );

  const reserved = add(add(reservedDebts, reservedGiving), reservedBills);
  return {
    income: summary.income,
    spent,
    reservedDebts,
    reservedGiving,
    reservedBills,
    safeToSpend: subtract(subtract(summary.income, spent), reserved),
  };
}

export type ColumnKey = 'spent' | 'debts' | 'giving' | 'bills' | 'used' | 'safe';
export interface ColumnPart {
  key: ColumnKey;
  laari: number;
}

/**
 * The month's money as one water column, top to bottom: what has gone out, what is still set aside
 * for debts, giving and bills, and what is left safe to spend. Parts with nothing in them are left
 * out. When the month is overspent there is no "safe" part and `shortBy` says by how much.
 *
 * Private mode folds everything that is not safe into one "used" part, so the column cannot show how
 * large the giving share is.
 */
export function waterColumn(safe: SafeToSpend, privacy: boolean): { parts: ColumnPart[]; total: number; shortBy: number } {
  const room = Math.max(safe.safeToSpend, 0);
  const raw: ColumnPart[] = privacy
    ? [{ key: 'used', laari: sum([safe.spent, safe.reservedDebts, safe.reservedGiving, safe.reservedBills]) }]
    : [
        { key: 'spent', laari: safe.spent },
        { key: 'debts', laari: safe.reservedDebts },
        { key: 'giving', laari: safe.reservedGiving },
        { key: 'bills', laari: safe.reservedBills },
      ];
  const parts = [...raw, { key: 'safe' as const, laari: room }].filter((part) => part.laari > 0);
  return { parts, total: sum(parts.map((part) => part.laari)), shortBy: safe.safeToSpend < 0 ? -safe.safeToSpend : 0 };
}

export interface UpcomingItem {
  kind: 'debt' | 'giving' | 'bill' | 'income';
  id: string;
  /** Raw name key: lender for debts, type for giving, name for bills. */
  label: string;
  dueOn: string;
  amount: number;
  overdue: boolean;
}

/** Things falling due in the next `days` days (and anything outstanding), soonest first. */
export function upcomingItems(input: {
  today: string;
  days: number;
  transactions: readonly Transaction[];
  debts: readonly Debt[];
  commitments: readonly Commitment[];
  recurring: readonly RecurringItem[];
  hijriAdjustment?: number;
}): UpcomingItem[] {
  const { today, days, transactions, debts, commitments, recurring, hijriAdjustment = 0 } = input;
  const horizon = addDays(today, days);
  const items: UpcomingItem[] = [];

  const month = monthOf(today);
  const nextMonth = lastDayOfMonth(month) < '9' ? addDays(lastDayOfMonth(month), 1) : today;
  for (const d of debts) {
    if (d.deleted_at !== null || d.min_payment_laari === 0 || currentBalance(d, transactions) === 0 || d.due_day === null) continue;
    // This month's due date first (overdue if it has passed unpaid), then next month's.
    for (const from of [`${month}-01`, nextMonth]) {
      const due = nextDueDate(d.due_day, from);
      if (due === null || due > horizon) break;
      if (paidInMonth(d.id, transactions, due.slice(0, 7)) < d.min_payment_laari) {
        items.push({ kind: 'debt', id: d.id, label: d.lender, dueOn: due, amount: d.min_payment_laari, overdue: due < today });
        break;
      }
    }
  }
  for (const c of commitments) {
    if (c.deleted_at !== null || !c.active) continue;
    const status = commitmentStatus(c, transactions, today, hijriAdjustment);
    const o = status.occurrence;
    if (o && !status.done && o.dueOn <= horizon) {
      items.push({ kind: 'giving', id: c.id, label: c.type, dueOn: o.dueOn, amount: c.amount_laari, overdue: status.overdue });
    }
  }
  for (const r of recurring) {
    if (r.deleted_at !== null || !r.active) continue;
    // The next unlogged date; anything before today is waiting to be logged.
    if (r.next_due_on <= horizon) {
      items.push({ kind: r.kind === 'income' ? 'income' : 'bill', id: r.id, label: r.name, dueOn: r.next_due_on, amount: r.amount_laari, overdue: r.next_due_on < today });
    }
  }
  return items.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : a.id < b.id ? -1 : 1));
}
