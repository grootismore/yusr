/** A shared account for a couple or a family. Each person's own records stay private; this is the one pot they share. */
export interface Household { id: string; name: string }
export interface HouseholdMember { user_id: string; display_name: string; role: 'owner' | 'member' }
export interface HouseholdEntry {
  id: string; household_id: string;
  /** Who paid it (an expense) or received it (income). */
  user_id: string; kind: 'expense' | 'income';
  amount_laari: number; currency: string; fx_rate_to_mvr: number; mvr_laari: number;
  category_id: string | null; merchant: string | null; note: string | null; entry_date: string;
}
export interface HouseholdEntryInput {
  kind: 'expense' | 'income'; amount_laari: number; currency: string; fx_rate_to_mvr: string;
  category_id: string | null; merchant: string | null; note: string | null; entry_date: string;
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

export const nameOf = (members: readonly HouseholdMember[], userId: string): string => members.find((m) => m.user_id === userId)?.display_name ?? '';
