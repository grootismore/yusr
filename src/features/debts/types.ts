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
  min_payment_laari: number;
  due_day: number | null;
  interest_bearing: boolean;
  interest_rate_bps: number | null;
  started_on: string | null;
  in_register: boolean;
  notes: string | null;
}

export interface DebtPayment { id: string; debt_id: string; amount_laari: number; paid_on: string; note: string | null }

export interface DebtInput {
  lender: string; kind: DebtKind; opening_balance_laari: number; min_payment_laari: number; due_day: number | null;
  interest_bearing: boolean; interest_rate_bps: number | null; in_register: boolean; notes: string | null;
}
