/** A shared account for a couple or a family. Each person's own records stay private; this is the one pot they share. */
export type HouseholdMode = 'couple' | 'household';
export interface Household { id: string; name: string; mode: HouseholdMode }
export interface HouseholdMember { user_id: string; display_name: string; role: 'owner' | 'member' }
export interface HouseholdEntry {
  id: string; household_id: string;
  /** Who paid it (an expense) or received it (income). */
  user_id: string; kind: 'expense' | 'income';
  amount_laari: number; currency: string; fx_rate_to_mvr: number; mvr_laari: number;
  category_id: string | null; merchant: string | null; note: string | null; entry_date: string;
  /** Foreign income the person who received it keeps in that currency (it then counts as held, and can be converted). */
  keep_in_currency?: boolean;
}
export interface HouseholdEntryInput {
  kind: 'expense' | 'income'; amount_laari: number; currency: string; fx_rate_to_mvr: string;
  category_id: string | null; merchant: string | null; note: string | null; entry_date: string;
  keep_in_currency?: boolean;
  /** Who paid or received it, when that is not the person recording it. */
  user_id?: string;
}

export interface MemberTotal { user_id: string; name: string; paid: number; received: number }
export interface HouseholdSummary { spent: number; income: number; left: number; members: MemberTotal[] }

/** What the household spent and took in over the entries given (in MVR), and what each person paid and received. */
export function summarize(entries: readonly HouseholdEntry[], members: readonly HouseholdMember[]): HouseholdSummary {
  let spent = 0, income = 0;
  const by = new Map<string, MemberTotal>(members.map((m) => [m.user_id, { user_id: m.user_id, name: m.display_name, paid: 0, received: 0 }]));
  for (const e of entries) {
    const m = by.get(e.user_id) ?? { user_id: e.user_id, name: '', paid: 0, received: 0 }; // someone who has since left
    if (e.kind === 'expense') { spent += e.mvr_laari; m.paid += e.mvr_laari; } else { income += e.mvr_laari; m.received += e.mvr_laari; }
    by.set(e.user_id, m);
  }
  return { spent, income, left: income - spent, members: [...by.values()] };
}

/**
 * In a couple, who is ahead: what you paid minus half of everything spent. Positive means your partner owes you that much,
 * negative means you owe them. Null when there is no partner yet.
 */
export function coupleBalance(summary: HouseholdSummary, myId: string): { partner: string; owed: number } | null {
  const me = summary.members.find((m) => m.user_id === myId);
  const other = summary.members.find((m) => m.user_id !== myId);
  if (!me || !other) return null;
  return { partner: other.name, owed: Math.round(me.paid - summary.spent / 2) };
}

/** What the household spent and took in over the entries, and the spending per category, for adding to a person's own figures. */
export function sharedTotals(entries: readonly HouseholdEntry[] | undefined): { spent: number; income: number; byCategory: Map<string | null, number> } {
  const byCategory = new Map<string | null, number>();
  let spent = 0, income = 0;
  for (const e of entries ?? []) {
    if (e.kind === 'income') { income += e.mvr_laari; continue; }
    spent += e.mvr_laari;
    byCategory.set(e.category_id, (byCategory.get(e.category_id) ?? 0) + e.mvr_laari);
  }
  return { spent, income, byCategory };
}

export const nameOf = (members: readonly HouseholdMember[], userId: string): string => members.find((m) => m.user_id === userId)?.display_name ?? '';
