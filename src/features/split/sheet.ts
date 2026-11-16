import { balances, simplify, type SplitData } from './logic';

/** One cost on the sheet, with names already filled in. */
export interface SheetLine { id: string; description: string; amount: number; paidBy: string; among: string[] }
export interface SheetMove { from: string; to: string; amount: number }
/** Everything a group's sheet for one day says, in names, ready to draw as a picture or send as text. */
export interface DaySheet {
  group: string; currency: string; date: string;
  lines: SheetLine[]; total: number;
  /** Who paid how much of the day's costs. */
  paid: { name: string; amount: number }[];
  /** Where everyone stands at the end of the day (positive: is owed), counting everything up to and including it. */
  standing: { name: string; net: number }[];
  /** The fewest payments that would settle the group at the end of the day. */
  transfers: SheetMove[];
  /** Payments between people recorded on the day. */
  settled: SheetMove[];
}

/** The sheet for `date` (YYYY-MM-DD), or null if there is no such group. */
export function daySheet(data: SplitData, groupId: string, date: string): DaySheet | null {
  const g = data.groups.find((x) => x.id === groupId);
  if (!g) return null;
  const people = data.people.filter((p) => p.group_id === groupId);
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? '';
  const expenses = data.expenses.filter((e) => e.group_id === groupId);
  const upTo = expenses.filter((e) => e.spent_on <= date);
  const upToIds = new Set(upTo.map((e) => e.id));
  const shares = data.shares.filter((s) => upToIds.has(s.expense_id));
  const settlements = data.settlements.filter((s) => s.group_id === groupId && s.settled_on <= date);
  const net = balances(people, upTo, shares, settlements);

  const today = expenses.filter((e) => e.spent_on === date);
  const lines: SheetLine[] = today.map((e) => ({
    id: e.id, description: e.description, amount: e.amount_minor, paidBy: name(e.paid_by),
    among: data.shares.filter((s) => s.expense_id === e.id && s.share_minor > 0).map((s) => name(s.person_id)),
  }));
  const paidBy = new Map<string, number>();
  for (const e of today) paidBy.set(e.paid_by, (paidBy.get(e.paid_by) ?? 0) + e.amount_minor);
  return {
    group: g.name, currency: g.currency, date, lines, total: today.reduce((s, e) => s + e.amount_minor, 0),
    paid: [...paidBy].map(([id, amount]) => ({ name: name(id), amount })).sort((a, b) => b.amount - a.amount),
    standing: people.map((p) => ({ name: p.name, net: net[p.id] ?? 0 })),
    transfers: simplify(net).map((x) => ({ from: name(x.from), to: name(x.to), amount: x.amount })),
    settled: data.settlements.filter((s) => s.group_id === groupId && s.settled_on === date).map((s) => ({ from: name(s.from_person), to: name(s.to_person), amount: s.amount_minor })),
  };
}
