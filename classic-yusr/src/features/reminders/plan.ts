import { currentBalance, nextDueDate, paidInMonth } from '@/features/debts/logic';
import type { Debt } from '@/features/debts/types';
import { addDays } from '@/features/giving/hijri';
import { commitmentStatus, currentOccurrence, isDoneIn } from '@/features/giving/schedule';
import type { Commitment } from '@/features/giving/types';
import { toISODate } from '@/features/transactions/logic';
import { dueDatesBetween } from '@/features/transactions/recurring';
import type { RecurringItem, Transaction } from '@/features/transactions/types';

export type ReminderKind = 'debt' | 'giving' | 'bill';

export interface Reminder {
  /** Stable id: kind, item and date. Never contains amounts or names. */
  key: string;
  kind: ReminderKind;
  fireAt: Date;
}

export const REMINDER_HOUR = 9;
/** iOS keeps at most 64 pending local notifications, so schedule the soonest 60. */
export const MAX_REMINDERS = 60;
export const HORIZON_DAYS = 45;

const fireAtNine = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, REMINDER_HOUR, 0, 0);
};

const monthsBetween = (fromIso: string, toIso: string): string[] => {
  const months: string[] = [];
  let [y, m] = fromIso.split('-').map(Number);
  const [ty, tm] = toIso.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    if (m === 12) [y, m] = [y + 1, 1];
    else m += 1;
  }
  return months;
};

/**
 * Every reminder to schedule over the next ~45 days, soonest first. A reminder fires at 09:00
 * local time on the day something is due, and only for things not already paid, given or logged.
 */
export function buildReminders(input: {
  now: Date;
  transactions: readonly Transaction[];
  debts: readonly Debt[];
  commitments: readonly Commitment[];
  recurring: readonly RecurringItem[];
  hijriAdjustment?: number;
  horizonDays?: number;
}): Reminder[] {
  const { now, transactions, debts, commitments, recurring, hijriAdjustment = 0, horizonDays = HORIZON_DAYS } = input;
  const today = toISODate(now);
  const horizon = addDays(today, horizonDays);
  const out = new Map<string, Reminder>();
  const add = (kind: ReminderKind, id: string, dueOn: string) => {
    const fireAt = fireAtNine(dueOn);
    if (dueOn < today || dueOn > horizon || fireAt <= now) return;
    out.set(`${kind}:${id}:${dueOn}`, { key: `${kind}:${id}:${dueOn}`, kind, fireAt });
  };

  for (const d of debts) {
    if (d.deleted_at !== null || d.due_day === null || d.min_payment_laari === 0 || currentBalance(d, transactions) === 0) continue;
    for (const month of monthsBetween(today.slice(0, 7), horizon.slice(0, 7))) {
      const due = nextDueDate(d.due_day, `${month}-01`);
      if (due && paidInMonth(d.id, transactions, month) < d.min_payment_laari) add('debt', d.id, due);
    }
  }

  for (const c of commitments) {
    if (c.deleted_at !== null || !c.active || !c.reminder_enabled) continue;
    if (c.schedule === 'weekly_friday') {
      for (let iso = today; iso <= horizon; iso = addDays(iso, 1)) {
        const status = commitmentStatus(c, transactions, iso, hijriAdjustment);
        if (status.occurrence?.dueOn === iso && !status.done) add('giving', c.id, iso);
      }
    } else if (c.schedule === 'monthly') {
      for (const month of monthsBetween(today.slice(0, 7), horizon.slice(0, 7))) {
        const o = currentOccurrence(c, `${month}-01`, transactions, hijriAdjustment);
        if (o && !isDoneIn(c, transactions, o.start, o.end)) add('giving', c.id, o.dueOn);
      }
    } else {
      // once / Ramadan / Dhul Hijjah: one reminder on the first day, if it is still ahead.
      const o = currentOccurrence(c, today, transactions, hijriAdjustment);
      if (o && !isDoneIn(c, transactions, o.start, o.end)) add('giving', c.id, c.schedule === 'once' ? o.dueOn : o.start);
    }
  }

  for (const r of recurring) {
    if (r.deleted_at !== null || !r.active) continue;
    for (const due of dueDatesBetween(r, today, horizon)) add('bill', r.id, due);
  }

  return [...out.values()]
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || (a.key < b.key ? -1 : 1))
    .slice(0, MAX_REMINDERS);
}
