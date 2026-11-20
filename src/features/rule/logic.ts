export type Group = 'needs' | 'wants' | 'savings';
export const GROUPS: readonly Group[] = ['needs', 'wants', 'savings'];
/** The 50/30/20 shares, in whole percent. */
export const SHARES: Record<Group, number> = { needs: 50, wants: 30, savings: 20 };

// Where each built-in category starts. Giving and money pools count as the 20: money set aside, not money spent.
const DEFAULTS: Record<string, Group> = {
  'food-groceries': 'needs', transport: 'needs', bills: 'needs', rent: 'needs', health: 'needs', education: 'needs', 'family-support': 'needs',
  shopping: 'wants', other: 'wants', giving: 'savings', 'money-pool': 'savings',
};

export type Overrides = Record<string, Group>;

/** The group a category counts in: the person's own choice, else the built-in default, else Wants (custom categories). */
export function groupOf(category: { id: string; slug: string | null }, overrides: Overrides): Group {
  return overrides[category.id] ?? (category.slug ? DEFAULTS[category.slug] : undefined) ?? 'wants';
}

export interface RuleLine {
  group: Group;
  /** What the rule allows (Needs, Wants) or asks for (Savings), in laari. */
  target: number;
  spent: number;
  /** 0 to 100 for the bar. */
  percent: number;
  /** Needs and Wants go over a ceiling; Savings reach a goal. */
  state: 'ok' | 'near' | 'over' | 'reached';
}

export interface RuleInput {
  income: number;
  /** Spending per category id (null = no category), in laari. */
  spentBy: ReadonlyMap<string | null, number>;
  categories: readonly { id: string; slug: string | null }[];
  overrides: Overrides;
  /** Debt payments made this month. They come off the income first: the rule splits what is left, and they are not savings. */
  debtPaid: number;
}

/** The income the rule splits: what came in, less the debt payments made. */
export const netIncome = (income: number, debtPaid: number): number => Math.max(0, income - debtPaid);

export function ruleSplit({ income, spentBy, categories, overrides, debtPaid }: RuleInput): RuleLine[] {
  const base = netIncome(income, debtPaid);
  const spent: Record<Group, number> = { needs: 0, wants: 0, savings: 0 };
  const known = new Set(categories.map((c) => c.id));
  for (const c of categories) spent[groupOf(c, overrides)] += spentBy.get(c.id) ?? 0;
  // Spending with no category, or in a category this phone doesn't list, counts as Wants.
  for (const [id, v] of spentBy) if (id === null || !known.has(id)) spent.wants += v;
  return GROUPS.map((group) => {
    const target = Math.floor((base * SHARES[group]) / 100);
    const s = spent[group];
    const percent = target > 0 ? Math.min(100, Math.floor((s * 100) / target)) : 0;
    const state = group === 'savings' ? (s >= target && target > 0 ? 'reached' : 'ok') : s > target ? 'over' : s >= target * 0.8 && target > 0 ? 'near' : 'ok';
    return { group, target, spent: s, percent, state };
  });
}
