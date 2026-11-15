import { addDays, addMonths } from '@/lib/dates';

export type Every = 'week' | 'month' | 'year';
export const EVERY: readonly Every[] = ['week', 'month', 'year'];

/** Something that repeats: a rent paid or received, a subscription, a bill, an allowance. */
export interface RecurringItem {
  id: string; kind: 'expense' | 'income'; name: string; note: string | null;
  /** Minor units of `currency`. */
  amount_minor: number; currency: string; category_id: string | null;
  every: Every; starts_on: string; ended_on: string | null;
  /** true: recorded by the app on the day. false: waits as "due" until the person taps Record or Skip. */
  auto_add: boolean;
}
export type RecurringInput = Pick<RecurringItem, 'kind' | 'name' | 'note' | 'amount_minor' | 'currency' | 'category_id' | 'every' | 'starts_on' | 'auto_add'>;
/** One date that has been dealt with: recorded (expense_id or income_id), skipped, or recorded and then deleted. */
export interface RecurringRun { id: string; recurring_id: string; occurrence: string; expense_id: string | null; income_id: string | null; skipped: boolean }

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The k-th date of a repeating item: same weekday, same day of the month (or the last day of a short month), same day of the year. */
export function nthDate(startsOn: string, every: Every, k: number): string {
  if (every === 'week') return addDays(startsOn, 7 * k);
  const [, , d] = startsOn.split('-').map(Number);
  const first = addMonths(`${startsOn.slice(0, 7)}-01`, every === 'month' ? k : 12 * k);
  const [y, m] = first.split('-').map(Number);
  return `${y}-${pad(m)}-${pad(Math.min(d, lastDay(y, m)))}`;
}

/** Every date the item has fallen on, from its start up to `upTo` (and its end, if it was stopped). At most 400. */
export function occurrences(item: Pick<RecurringItem, 'starts_on' | 'every' | 'ended_on'>, upTo: string): string[] {
  const limit = item.ended_on && item.ended_on < upTo ? item.ended_on : upTo;
  const out: string[] = [];
  for (let k = 0; k < 400; k++) {
    const date = nthDate(item.starts_on, item.every, k);
    if (date > limit) break;
    out.push(date);
  }
  return out;
}

export interface DueRun { item: RecurringItem; occurrence: string }

/** Dates that have come due and have not been dealt with, oldest first. At most 12 per item. */
export function dueRuns(items: readonly RecurringItem[], runs: readonly RecurringRun[], todayIso: string): DueRun[] {
  const done = new Set(runs.map((r) => `${r.recurring_id}|${r.occurrence}`));
  const out: DueRun[] = [];
  for (const item of items) {
    if (item.ended_on && item.ended_on < item.starts_on) continue;
    const missing = occurrences(item, todayIso).filter((o) => !done.has(`${item.id}|${o}`));
    for (const occurrence of missing.slice(-12)) out.push({ item, occurrence });
  }
  return out;
}

/** The next date after today (or today itself if it falls today and is not yet dealt with is "due", not "next"). */
export function nextDate(item: Pick<RecurringItem, 'starts_on' | 'every' | 'ended_on'>, todayIso: string): string | null {
  for (let k = 0; k < 800; k++) {
    const date = nthDate(item.starts_on, item.every, k);
    if (item.ended_on && date > item.ended_on) return null;
    if (date > todayIso) return date;
  }
  return null;
}

export const activeItems = (all: readonly RecurringItem[]): RecurringItem[] => all.filter((i) => !i.ended_on);
