export const DEBT_KINDS = ['bank', 'loan', 'credit_card', 'personal', 'qard_hasan'] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

/** A debt with its derived balance (from the debt_balances view). */
export interface Debt {
  id: string;
  lender: string;
  kind: DebtKind;
  opening_balance_laari: number;
  balance_laari: number;
  paid_laari: number;
  /** The fixed minimum, or the floor when `min_pct_bps` is set. In the debt's currency. */
  min_payment_laari: number;
  /** Minimum as a share of the balance, in basis points (500 = 5%), or null for a fixed minimum. */
  min_pct_bps: number | null;
  /** Balances, minimums and payments' effect are in this currency's minor units. */
  currency: string;
  due_day: number | null;
  interest_bearing: boolean;
  interest_rate_bps: number | null;
  started_on: string | null;
  in_register: boolean;
  notes: string | null;
}

/** `amount_laari` is in the debt's currency; `paid_mvr_laari` is what was really paid in MVR when that differs. */
export interface DebtPayment { id: string; debt_id: string; amount_laari: number; paid_mvr_laari: number | null; paid_on: string; note: string | null }

export interface DebtInput {
  lender: string; kind: DebtKind; opening_balance_laari: number; min_payment_laari: number; min_pct_bps: number | null; currency: string; due_day: number | null;
  interest_bearing: boolean; interest_rate_bps: number | null; in_register: boolean; notes: string | null;
}
