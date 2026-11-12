export const KINDS = ['expense', 'income', 'giving'] as const;
export type Kind = (typeof KINDS)[number];

export const ACCOUNT_TYPES = ['cash', 'bml', 'mcb', 'sdfc', 'mib', 'other'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

interface Timestamps {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Account extends Timestamps {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance_laari: number;
}

export interface Category extends Timestamps {
  id: string;
  /** null for the built-in defaults. */
  user_id: string | null;
  name_en: string;
  name_dv: string;
  kind: Kind;
  is_default: boolean;
}

export interface Transaction extends Timestamps {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  /** Always positive; `kind` carries the direction. */
  amount_laari: number;
  kind: Kind;
  /** Local calendar date, YYYY-MM-DD. */
  occurred_on: string;
  note: string | null;
  debt_id: string | null;
  commitment_id: string | null;
}

export interface RecurringItem extends Timestamps {
  id: string;
  user_id: string;
  name: string;
  kind: 'income' | 'expense';
  amount_laari: number;
  category_id: string;
  account_id: string;
  schedule: 'weekly' | 'monthly';
  /** 1-31, for monthly items. */
  day_of_month: number | null;
  /** 0 (Sunday) - 6 (Saturday), for weekly items. */
  weekday: number | null;
  next_due_on: string;
  active: boolean;
}
