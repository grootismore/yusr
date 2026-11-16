/** Split: sharing costs with friends, Splitwise style. All amounts are integer minor units of the group's currency. */
/** `user_id` is who made the group (its owner). */
export interface SplitGroup { id: string; name: string; currency: string; archived: boolean; user_id?: string }
/** `account_id` is the signed-in friend this name is linked to (they see the group live); empty for a plain name. */
export interface SplitPerson { id: string; group_id: string; name: string; is_me: boolean; account_id?: string | null }
/** An email invitation waiting for a friend to sign in. */
export interface SplitInvite { id: string; group_id: string; person_id: string; email: string }
/** An invitation for me, from a group I am not in yet. */
export interface MyInvite { invite_id: string; group_name: string; invited_by_name: string | null; person_name: string }
export type SplitType = 'equal' | 'exact' | 'percent' | 'shares';
export const SPLIT_TYPES: readonly SplitType[] = ['equal', 'exact', 'percent', 'shares'];
export interface SplitExpense { id: string; group_id: string; description: string; amount_minor: number; paid_by: string; split_type: SplitType; spent_on: string; note: string | null }
export interface SplitShare { expense_id: string; person_id: string; share_minor: number }
export interface SplitSettlement { id: string; group_id: string; from_person: string; to_person: string; amount_minor: number; settled_on: string; note: string | null }
export interface SplitData { groups: SplitGroup[]; people: SplitPerson[]; expenses: SplitExpense[]; shares: SplitShare[]; settlements: SplitSettlement[] }

export type ShareResult = { ok: true; shares: Record<string, number> } | { ok: false; error: 'nobody' | 'sum' | 'zero' };

/**
 * Divide `total` between the people in `values` (person id to what they were given). The result always adds up to the
 * total, to the last unit: leftover units go to whoever's exact share had the largest fraction, the first of them first.
 * - equal: `values` only says who is in; the numbers are ignored.
 * - exact: the amounts are the shares, and must add up to `total`.
 * - percent: `values` are hundredths of a percent (3333 = 33.33%), and must add up to 10000.
 * - shares: `values` are weights (1, 2, 3...); a person with weight 2 pays twice a person with weight 1.
 */
export function computeShares(total: number, type: SplitType, values: Record<string, number>): ShareResult {
  const ids = Object.keys(values);
  if (ids.length === 0) return { ok: false, error: 'nobody' };
  if (type === 'exact') {
    const sum = ids.reduce((s, id) => s + values[id], 0);
    return sum === total ? { ok: true, shares: { ...values } } : { ok: false, error: 'sum' };
  }
  const weights = type === 'equal' ? ids.map(() => 1) : ids.map((id) => values[id]);
  const wsum = weights.reduce((s, w) => s + w, 0);
  if (type === 'percent' && wsum !== 10_000) return { ok: false, error: 'sum' };
  if (wsum <= 0) return { ok: false, error: 'zero' };
  const exact = weights.map((w) => (total * w) / wsum);
  const base = exact.map((x) => Math.floor(x));
  let left = total - base.reduce((s, b) => s + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) { if (left <= 0) break; base[i] += 1; left -= 1; }
  return { ok: true, shares: Object.fromEntries(ids.map((id, i) => [id, base[i]])) };
}

/** What each person is owed (positive) or owes (negative) in a group, from what they paid, their shares and settlements. */
export function balances(people: readonly SplitPerson[], expenses: readonly SplitExpense[], shares: readonly SplitShare[], settlements: readonly SplitSettlement[]): Record<string, number> {
  const net: Record<string, number> = Object.fromEntries(people.map((p) => [p.id, 0]));
  const add = (id: string, n: number) => { net[id] = (net[id] ?? 0) + n; };
  const ids = new Set(expenses.map((e) => e.id));
  for (const e of expenses) add(e.paid_by, e.amount_minor);
  for (const s of shares) if (ids.has(s.expense_id)) add(s.person_id, -s.share_minor);
  for (const t of settlements) { add(t.from_person, t.amount_minor); add(t.to_person, -t.amount_minor); }
  return net;
}

export interface Transfer { from: string; to: string; amount: number }

/** The fewest payments that settle everyone: the biggest debtor pays the biggest creditor, and so on. */
export function simplify(net: Record<string, number>): Transfer[] {
  const debtors = Object.entries(net).filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v || (a.id < b.id ? -1 : 1));
  const creditors = Object.entries(net).filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v || (a.id < b.id ? -1 : 1));
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    if (amount > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].v -= amount; creditors[j].v -= amount;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

/** Me in a group: the name linked to my account; else the unlinked name marked as mine (a group still waiting to be sent). */
export const meOf = (people: readonly SplitPerson[], accountId?: string | null): SplitPerson | undefined =>
  (accountId ? people.find((p) => p.account_id === accountId) : undefined) ?? people.find((p) => p.is_me && !p.account_id);

/** The group's rows, picked out of everything the phone has. */
export function ofGroup(data: SplitData, groupId: string) {
  const people = data.people.filter((p) => p.group_id === groupId);
  const expenses = data.expenses.filter((e) => e.group_id === groupId);
  const ids = new Set(expenses.map((e) => e.id));
  const shares = data.shares.filter((s) => ids.has(s.expense_id));
  const settlements = data.settlements.filter((s) => s.group_id === groupId);
  return { people, expenses, shares, settlements, net: balances(people, expenses, shares, settlements) };
}
