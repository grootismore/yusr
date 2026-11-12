import type { Transaction } from '@/features/transactions/types';
import { addDays, DHUL_HIJJAH, RAMADAN, upcomingHijriMonth } from './hijri';
import type { Commitment } from './types';

const FRIDAY = 5;
const pad = (n: number) => String(n).padStart(2, '0');

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export interface Occurrence {
  /** The day it falls due. For a month-long schedule (Ramadan), the first day still ahead. */
  dueOn: string;
  /** Marking it done on any day in this window counts for this occurrence. */
  start: string;
  end: string;
}

function monthOccurrence(year: number, month: number, day: number): Occurrence {
  const last = lastDayOf(year, month);
  return {
    dueOn: `${year}-${pad(month)}-${pad(Math.min(day, last))}`,
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(last)}`,
  };
}

/** Has a giving transaction been logged for this commitment inside the window? */
export function isDoneIn(c: Commitment, transactions: readonly Transaction[], start: string, end: string): boolean {
  return transactions.some(
    (t) => t.commitment_id === c.id && t.deleted_at === null && t.occurred_on >= start && t.occurred_on <= end,
  );
}

/**
 * The occurrence a commitment is working towards on `today`: the one still outstanding or in
 * progress, otherwise the next one. Null when it cannot be worked out.
 */
export function currentOccurrence(
  c: Commitment,
  today: string,
  transactions: readonly Transaction[] = [],
  hijriAdjustment = 0,
): Occurrence | null {
  switch (c.schedule) {
    case 'once':
      return c.due_on ? { dueOn: c.due_on, start: c.due_on, end: c.due_on } : null;
    case 'weekly_friday': {
      // The Friday on or after today. The window opens the Saturday before, so a missed week just moves on.
      const friday = addDays(today, (FRIDAY - weekdayOf(today) + 7) % 7);
      return { dueOn: friday, start: addDays(friday, -6), end: friday };
    }
    case 'monthly': {
      if (!c.day_of_month) return null;
      const [year, month] = today.split('-').map(Number);
      const thisMonth = monthOccurrence(year, month, c.day_of_month);
      // This month's gift stays in view until it is done, even after its day has passed.
      if (thisMonth.dueOn >= today || !isDoneIn(c, transactions, thisMonth.start, thisMonth.end)) return thisMonth;
      return month === 12 ? monthOccurrence(year + 1, 1, c.day_of_month) : monthOccurrence(year, month + 1, c.day_of_month);
    }
    case 'ramadan':
    case 'dhul_hijjah': {
      const range = upcomingHijriMonth(c.schedule === 'ramadan' ? RAMADAN : DHUL_HIJJAH, today, hijriAdjustment);
      return { dueOn: range.start > today ? range.start : today, start: range.start, end: range.end };
    }
  }
}

export interface CommitmentStatus {
  occurrence: Occurrence | null;
  done: boolean;
  /** Past its day and not done. Only one-offs and monthly gifts can be overdue; weekly and seasonal ones never are. */
  overdue: boolean;
}

export function commitmentStatus(
  c: Commitment,
  transactions: readonly Transaction[],
  today: string,
  hijriAdjustment = 0,
): CommitmentStatus {
  const occurrence = currentOccurrence(c, today, transactions, hijriAdjustment);
  if (!occurrence) return { occurrence: null, done: false, overdue: false };
  const done = isDoneIn(c, transactions, occurrence.start, occurrence.end);
  const canBeOverdue = c.schedule === 'once' || c.schedule === 'monthly';
  return { occurrence, done, overdue: canBeOverdue && !done && occurrence.dueOn < today };
}
