export const DEBT_KINDS = ['bank', 'person', 'store', 'other'] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

export interface Debt {
  id: string;
  user_id: string;
  lender: string;
  kind: DebtKind;
  original_laari: number;
  /** Balance when tracking started or was last corrected. The current balance is derived (see logic.ts). */
  balance_laari: number;
  min_payment_laari: number;
  due_day: number | null;
  /** When the debt began (optional). Added in migration 010. */
  started_on?: string | null;
  is_interest_bearing: boolean;
  /** Annual rate in basis points (1250 = 12.5%), only for interest-bearing debt. */
  interest_rate_bps: number | null;
  /** Ids of the Vault secrets holding the reference number / notes. Server-written only. */
  reference_secret_id: string | null;
  notes_secret_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Receivable {
  id: string;
  user_id: string;
  debtor: string;
  amount_laari: number;
  due_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Archived = received or written off. */
  deleted_at: string | null;
}
