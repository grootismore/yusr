export type Direction = 'lent' | 'borrowed';
export type Nudge = 'off' | 'me' | 'both';

export interface Iou {
  id: string;
  user_id: string;
  /** From the point of view of whoever made it (user_id). */
  direction: Direction;
  person_name: string;
  person_email: string | null;
  person_account: string | null;
  title: string | null;
  amount_laari: number;
  lent_on: string;
  due_on: string | null;
  nudge: Nudge;
}
export interface IouPayment { id: string; iou_id: string; amount_laari: number; paid_on: string; note: string | null; created_by: string }
export interface IouInput {
  direction: Direction; person_name: string; person_email: string | null; title: string | null; amount_laari: number;
  lent_on: string; due_on: string | null; nudge: Nudge;
}
export interface IouInvite { iou_id: string; made_by_name: string | null; direction: Direction; amount_laari: number; title: string | null; due_on: string | null }

/** Am I the one owed ('lent') or the one who owes ('borrowed')? The IOU is written from its maker's side; the other person sees it turned round. */
export const roleOf = (iou: Iou, me: string): Direction => (iou.user_id === me ? iou.direction : iou.direction === 'lent' ? 'borrowed' : 'lent');

/** The name to show for the other person: the name the maker gave, or for the other side, the maker's name is not known, so a neutral label comes from the screen. */
export const otherName = (iou: Iou, me: string, fallback: string): string => (iou.user_id === me ? iou.person_name : fallback);

export const paidOf = (payments: readonly IouPayment[]): number => payments.reduce((s, p) => s + p.amount_laari, 0);
/** What is still owed. Never below zero: paying too much just settles it. */
export const remaining = (iou: Iou, payments: readonly IouPayment[]): number => Math.max(0, iou.amount_laari - paidOf(payments));
export const isSettled = (iou: Iou, payments: readonly IouPayment[]): boolean => remaining(iou, payments) === 0;

export type Status = 'settled' | 'overdue' | 'dueSoon' | 'open';
/** overdue: past the due date. dueSoon: due within 7 days. */
export function statusOf(iou: Iou, payments: readonly IouPayment[], today: string): Status {
  if (isSettled(iou, payments)) return 'settled';
  if (!iou.due_on) return 'open';
  if (iou.due_on < today) return 'overdue';
  return daysBetween(today, iou.due_on) <= 7 ? 'dueSoon' : 'open';
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
const addDays = (date: string, n: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface TimelineEvent {
  kind: 'lent' | 'payment' | 'due';
  date: string;
  /** Money moved by this event (the loan or a payment); 0 for the due date. */
  amount: number;
  /** What is still owed once this event has happened (for the due date: owed at that point). */
  left: number;
  paymentId?: string;
  createdBy?: string;
  note?: string | null;
  /** The due date and later events that have not happened yet. */
  future: boolean;
}

/** The loan, every payment and the due date in date order, each with what is left after it. */
export function timeline(iou: Iou, payments: readonly IouPayment[], today: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let left = iou.amount_laari;
  events.push({ kind: 'lent', date: iou.lent_on, amount: iou.amount_laari, left, future: iou.lent_on > today });
  const sorted = [...payments].sort((a, b) => (a.paid_on === b.paid_on ? 0 : a.paid_on < b.paid_on ? -1 : 1));
  const rows: TimelineEvent[] = sorted.map((p) => { left = Math.max(0, left - p.amount_laari); return { kind: 'payment', date: p.paid_on, amount: p.amount_laari, left, paymentId: p.id, createdBy: p.created_by, note: p.note, future: p.paid_on > today }; });
  if (iou.due_on) {
    // The due date goes where it falls among the payments, showing what was owed on that day.
    let owed = iou.amount_laari;
    let at = 0;
    for (const r of rows) { if (r.date <= iou.due_on) { owed = r.left; at += 1; } }
    rows.splice(at, 0, { kind: 'due', date: iou.due_on, amount: 0, left: owed, future: iou.due_on > today });
  }
  return [...events, ...rows];
}

/** Days from the due date on which a reminder goes out: 2 days before, then every 3 days, six in all. */
export const NUDGE_DAYS: readonly number[] = [-2, 1, 4, 7, 10, 13];

/** The dates of the reminders still to come, from today on. */
export function nudgeDates(due: string | null, today: string): string[] {
  if (!due) return [];
  return NUDGE_DAYS.map((d) => addDays(due, d)).filter((d) => d >= today);
}

/** The message to send someone by hand (WhatsApp, text). Plain and polite. */
export function nudgeMessage(a: { name: string; amountText: string; title: string | null; due: string | null; dueText: string; text: { due: string; open: string } }): string {
  const what = a.title ? `${a.title} (${a.amountText})` : a.amountText;
  return (a.due ? a.text.due : a.text.open).replace('{{name}}', a.name).replace('{{what}}', what).replace('{{date}}', a.dueText);
}

/** What you are owed and what you owe, across the open IOUs. */
export function totals(ious: readonly Iou[], payments: readonly IouPayment[], me: string): { owedToMe: number; iOwe: number } {
  let owedToMe = 0, iOwe = 0;
  for (const i of ious) {
    const left = remaining(i, payments.filter((p) => p.iou_id === i.id));
    if (roleOf(i, me) === 'lent') owedToMe += left; else iOwe += left;
  }
  return { owedToMe, iOwe };
}

export interface IouPerson { id: string; name: string; email: string | null }

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
/** The saved person with this name (names are matched without regard to case or spaces at the ends). */
export const findPerson = (people: readonly IouPerson[], name: string): IouPerson | undefined => people.find((p) => same(p.name, name));

/**
 * What to do with the saved people when an IOU is saved: add the person if they are new; fill in their email if the list
 * had none and this IOU has one. Nothing else changes, so a typo here never overwrites someone saved earlier.
 */
export function personToSave(people: readonly IouPerson[], name: string, email: string | null): { add: { name: string; email: string | null } } | { fill: { id: string; email: string } } | null {
  const n = name.trim();
  if (!n) return null;
  const known = findPerson(people, n);
  if (!known) return { add: { name: n, email } };
  if (!known.email && email) return { fill: { id: known.id, email } };
  return null;
}
