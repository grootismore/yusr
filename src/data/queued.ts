import * as Crypto from 'expo-crypto';
import type { QueryClient } from '@tanstack/react-query';
import { toMvrLaari } from '@/lib/money';
import * as api from './api';
import type { Expense, NewExpense } from './types';
import type { Debt } from '@/features/debts/types';

/**
 * The saves that still work with no signal: they are kept on the phone and sent when the connection is back.
 * Each is a "create": the phone makes the id up front, so sending one twice can never make two.
 */
const OPS = { addExpense: api.addExpense, addIncome: api.addIncome, addIncomeSplit: api.addIncomeSplit, logGiving: api.logGiving, addDebtPayment: api.addDebtPayment } as const;
export type OpName = keyof typeof OPS;

export const opNameOf = (fn: unknown): OpName | null => (Object.keys(OPS) as OpName[]).find((k) => OPS[k] === fn) ?? null;
export const runOp = (op: string, args: unknown): Promise<void> => (OPS[op as OpName] as (a: unknown) => Promise<void>)(args);

/** Give the entry the ids it will be saved under. */
export function withIds<A>(op: OpName, args: A): A {
  const a = args as Record<string, unknown>;
  if (op === 'addIncomeSplit') return { ...a, ids: (a.ids as string[] | undefined) ?? (a.rows as unknown[]).map(() => Crypto.randomUUID()) } as A;
  return { ...a, id: (a.id as string | undefined) ?? Crypto.randomUUID() } as A;
}

const monthOf = (iso: string): string => `${iso.slice(0, 7)}-01`;
const prepend = <T,>(qc: QueryClient, key: unknown[], row: T) => qc.setQueryData<T[]>(key, (old) => [row, ...(old ?? []).filter((x) => (x as { id?: string }).id !== (row as { id?: string }).id)]);

/** Show a saved-offline entry in the lists straight away; the real rows replace these once they are sent. */
export function applyOptimistic(qc: QueryClient, op: OpName, args: unknown): void {
  try {
    if (op === 'addExpense') {
      const e = args as NewExpense;
      const row: Expense = { id: e.id as string, amount_laari: e.amount_laari, currency: e.currency, fx_rate_to_mvr: Number(e.fx_rate_to_mvr), mvr_laari: toMvrLaari(e.amount_laari, e.fx_rate_to_mvr), category_id: e.category_id, merchant: e.merchant, spent_at: e.spent_at, note: e.note, source: 'manual', receipt_id: null };
      prepend(qc, ['expenses', monthOf(e.spent_at)], row);
    } else if (op === 'addIncome') {
      const e = args as NewExpense;
      prepend(qc, ['income', monthOf(e.spent_at)], { id: e.id, amount_laari: e.amount_laari, currency: e.currency, mvr_laari: toMvrLaari(e.amount_laari, e.fx_rate_to_mvr), received_at: e.spent_at, note: e.note });
    } else if (op === 'addIncomeSplit') {
      const s = args as Parameters<typeof api.addIncomeSplit>[0];
      s.rows.forEach((r, i) => prepend(qc, ['income', monthOf(s.received_at)], { id: s.ids?.[i], amount_laari: r.amount_laari, currency: r.currency, mvr_laari: toMvrLaari(r.amount_laari, r.fx_rate_to_mvr), received_at: s.received_at, note: s.note }));
    } else if (op === 'addDebtPayment') {
      const p = args as Parameters<typeof api.addDebtPayment>[0];
      prepend(qc, ['debt-payments'], { id: p.id, debt_id: p.debt_id, amount_laari: p.amount_laari, paid_mvr_laari: p.paid_mvr_laari ?? null, paid_on: p.paid_on, note: p.note });
      qc.setQueryData<Debt[]>(['debts'], (old) => old?.map((d) => (d.id === p.debt_id ? { ...d, paid_laari: d.paid_laari + p.amount_laari, balance_laari: Math.max(0, d.balance_laari - p.amount_laari) } : d)));
    } else if (op === 'logGiving') {
      const g = args as Parameters<typeof api.logGiving>[0];
      prepend(qc, ['giving', monthOf(g.spent_at)], { id: g.id, expense_id: g.id, kind: g.kind, recipient_note: g.recipient_note, amount_laari: g.amount_laari, spent_at: g.spent_at, commitment_id: g.commitment_id ?? null });
    }
  } catch { /* the entry is still queued; the lists catch up when it is sent */ }
}
