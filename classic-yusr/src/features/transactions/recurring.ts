import { addDays } from '@/features/giving/hijri';
import type { RecurringItem } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

function monthDate(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(Math.min(day, last))}`;
}

/** The first due date strictly after `after` (a YYYY-MM-DD date) for a recurring item's schedule. */
export function nextDueAfter(item: Pick<RecurringItem, 'schedule' | 'day_of_month' | 'weekday'>, after: string): string {
  const [year, month, day] = after.split('-').map(Number);
  if (item.schedule === 'weekly') {
    const weekday = new Date(year, month - 1, day, 12).getDay();
    const ahead = ((item.weekday ?? 0) - weekday + 7) % 7;
    return addDays(after, ahead === 0 ? 7 : ahead);
  }
  const dueDay = item.day_of_month ?? 1;
  const thisMonth = monthDate(year, month, dueDay);
  if (thisMonth > after) return thisMonth;
  return month === 12 ? monthDate(year + 1, 1, dueDay) : monthDate(year, month + 1, dueDay);
}

/** Every date an item falls due between `from` and `to` inclusive, starting from its next_due_on. */
export function dueDatesBetween(item: RecurringItem, from: string, to: string): string[] {
  const dates: string[] = [];
  let due = item.next_due_on;
  // Bounded loop: at most ~one date per day in the window (weekly) or fewer.
  for (let guard = 0; due <= to && guard < 400; guard++) {
    if (due >= from) dates.push(due);
    due = nextDueAfter(item, due);
  }
  return dates;
}
