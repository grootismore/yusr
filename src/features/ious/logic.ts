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

/** Who a payment came from: the person who owes. When you lent, that is them; when you borrowed, it is you. (Not who typed it in: you can record a payment they made.) */
export const payerOf = (role: Direction, otherName: string, youName: string): string => (role === 'lent' ? otherName : youName);

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

export interface PersonGroup {
  /** Who this is: a name you typed (matched without regard to case), or the other person's account. */
  key: string;
  name: string;
  email: string | null;
  ious: Iou[];
  owedToMe: number;
  iOwe: number;
  /** What the person owes you less what you owe them. Negative means you owe them. */
  net: number;
  /** The most pressing state among the open IOUs, or settled when none are open. */
  status: Status;
  openCount: number;
  /** What the open IOUs were for (the names you gave them), newest first. */
  titles: string[];
  /** The earliest due date among the open IOUs, if any. */
  nextDue: string | null;
}

const URGENCY: Record<Status, number> = { overdue: 3, dueSoon: 2, open: 1, settled: 0 };
const personKey = (iou: Iou, me: string): string => (iou.user_id === me ? `n:${iou.person_name.trim().toLowerCase()}` : `a:${iou.user_id}`);

/** The IOUs gathered by the person they are with, so each person shows once however many IOUs there are. */
export function groupByPerson(ious: readonly Iou[], payments: readonly IouPayment[], me: string, otherLabel: string, today: string): PersonGroup[] {
  const by = new Map<string, PersonGroup>();
  for (const i of ious) {
    const key = personKey(i, me);
    const g = by.get(key) ?? { key, name: i.user_id === me ? i.person_name.trim() : otherLabel, email: i.user_id === me ? i.person_email : null, ious: [], owedToMe: 0, iOwe: 0, net: 0, status: 'settled' as Status, openCount: 0, titles: [], nextDue: null };
    const mine = payments.filter((p) => p.iou_id === i.id);
    const left = remaining(i, mine);
    g.ious.push(i);
    if (left > 0) {
      g.openCount += 1;
      if (i.title?.trim()) g.titles.push(i.title.trim());
      if (i.due_on && (!g.nextDue || i.due_on < g.nextDue)) g.nextDue = i.due_on;
      if (roleOf(i, me) === 'lent') g.owedToMe += left; else g.iOwe += left;
      const s = statusOf(i, mine, today);
      if (URGENCY[s] > URGENCY[g.status]) g.status = s;
    }
    if (!g.email && i.user_id === me && i.person_email) g.email = i.person_email;
    by.set(key, g);
  }
  const groups = [...by.values()].map((g) => ({ ...g, net: g.owedToMe - g.iOwe }));
  // People with something open first, the most pressing first, then the biggest balance; settled people last.
  return groups.sort((a, b) => (b.openCount > 0 ? 1 : 0) - (a.openCount > 0 ? 1 : 0) || URGENCY[b.status] - URGENCY[a.status] || Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name));
}

export interface PersonEvent {
  kind: 'lent' | 'borrowed' | 'theyPaid' | 'youPaid';
  date: string;
  amount: number;
  title: string | null;
  /** What the person owes you after this (negative: you owe them). */
  net: number;
  future: boolean;
}

/** Everything with one person in date order (loans and payments across all their IOUs) with the running balance. */
export function personTimeline(group: PersonGroup, payments: readonly IouPayment[], me: string, today: string): PersonEvent[] {
  const raw: Omit<PersonEvent, 'net'>[] = [];
  for (const i of group.ious) {
    const role = roleOf(i, me);
    raw.push({ kind: role === 'lent' ? 'lent' : 'borrowed', date: i.lent_on, amount: i.amount_laari, title: i.title, future: i.lent_on > today });
    for (const p of payments.filter((x) => x.iou_id === i.id)) raw.push({ kind: role === 'lent' ? 'theyPaid' : 'youPaid', date: p.paid_on, amount: p.amount_laari, title: i.title, future: p.paid_on > today });
  }
  const order = { lent: 0, borrowed: 0, theyPaid: 1, youPaid: 1 };
  raw.sort((a, b) => (a.date === b.date ? order[a.kind] - order[b.kind] : a.date < b.date ? -1 : 1));
  let net = 0;
  // What they owe you: a loan from you adds, a loan to you takes away, their payment takes away, your payment adds back.
  const sign = { lent: 1, borrowed: -1, theyPaid: -1, youPaid: 1 };
  return raw.map((e) => { net += sign[e.kind] * e.amount; return { ...e, net }; });
}
