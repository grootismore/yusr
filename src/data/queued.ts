import * as Crypto from 'expo-crypto';
import type { QueryClient } from '@tanstack/react-query';
import { toMvrLaari } from '@/lib/money';
import * as api from './api';
import type { Expense, NewExpense } from './types';
import type { Debt, DebtInput, DebtPayment } from '@/features/debts/types';
import type { BudgetRow } from '@/lib/budget';
import type { MoneyPool, PoolInput } from '@/features/pools/logic';
import type { RecurringInput, RecurringItem } from '@/features/recurring/logic';

/**
 * The saves that still work with no signal: they are kept on the phone and sent when the connection is back.
 * Each is a "create": the phone makes the id up front, so sending one twice can never make two.
 */
const OPS = {
  // creates: the phone makes the id up front
  addExpense: api.addExpense, addIncome: api.addIncome, addIncomeSplit: api.addIncomeSplit, logGiving: api.logGiving, addDebtPayment: api.addDebtPayment,
  // changes and deletes: safe to send again, and the latest change is the one that stays
  updateExpense: api.updateExpense, deleteExpense: api.deleteExpense, updateSadaqah: api.updateSadaqah, deleteGiving: api.deleteGiving,
  updateIncome: api.updateIncome, deleteIncome: api.deleteIncome, updateDebtPayment: api.updateDebtPayment, deleteDebtPayment: api.deleteDebtPayment,
  deleteConversion: api.deleteConversion,
  // budgets and debts
  setBudget: api.setBudget, clearBudget: api.clearBudget, addDebt: api.addDebt, updateDebt: api.updateDebt, deleteDebt: api.deleteDebt,
  // money pools
  addPool: api.addPool, updatePool: api.updatePool, endPool: api.endPool, logPoolPayment: api.logPoolPayment,
  // recurring
  addRecurring: api.addRecurring, updateRecurring: api.updateRecurring, endRecurring: api.endRecurring, logRecurring: api.logRecurring, skipRecurring: api.skipRecurring,
} as const;
const CREATES: readonly string[] = ['addExpense', 'addIncome', 'addIncomeSplit', 'logGiving', 'addDebtPayment', 'addDebt', 'addPool', 'logPoolPayment', 'addRecurring', 'logRecurring'];
export type OpName = keyof typeof OPS;

export const opNameOf = (fn: unknown): OpName | null => (Object.keys(OPS) as OpName[]).find((k) => OPS[k] === fn) ?? null;
export const runOp = (op: string, args: unknown): Promise<void> => (OPS[op as OpName] as (a: unknown) => Promise<void>)(args);

/** Give the entry the ids it will be saved under. */
export function withIds<A>(op: OpName, args: A): A {
  if (!CREATES.includes(op)) return args;
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
    } else if (op === 'deleteExpense' || op === 'deleteGiving') {
      const id = args as string;
      qc.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (old) => old?.filter((x) => x.id !== id));
      qc.setQueriesData<{ expense_id: string }[]>({ queryKey: ['giving'] }, (old) => old?.filter((x) => x.expense_id !== id));
    } else if (op === 'updateExpense') {
      const { id, e } = args as { id: string; e: NewExpense };
      qc.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (old) => old?.map((x) => (x.id === id ? { ...x, amount_laari: e.amount_laari, currency: e.currency, fx_rate_to_mvr: Number(e.fx_rate_to_mvr), mvr_laari: toMvrLaari(e.amount_laari, e.fx_rate_to_mvr), category_id: e.category_id, merchant: e.merchant, spent_at: e.spent_at, note: e.note } : x)));
      qc.setQueryData<Expense>(['expense', id], (x) => (x ? { ...x, amount_laari: e.amount_laari, currency: e.currency, fx_rate_to_mvr: Number(e.fx_rate_to_mvr), mvr_laari: toMvrLaari(e.amount_laari, e.fx_rate_to_mvr), category_id: e.category_id, merchant: e.merchant, spent_at: e.spent_at, note: e.note } : x));
    } else if (op === 'updateSadaqah') {
      const { id, kind, recipient_note } = args as { id: string; kind: string; recipient_note: string | null };
      qc.setQueriesData<{ id: string }[]>({ queryKey: ['giving'] }, (old) => old?.map((x) => (x.id === id ? { ...x, kind, recipient_note } : x)));
    } else if (op === 'deleteIncome') {
      qc.setQueriesData<{ id: string }[]>({ queryKey: ['income'] }, (old) => old?.filter((x) => x.id !== (args as string)));
    } else if (op === 'updateIncome') {
      const { id, e } = args as { id: string; e: NewExpense & { keep_in_currency: boolean } };
      qc.setQueriesData<{ id: string }[]>({ queryKey: ['income'] }, (old) => old?.map((x) => (x.id === id ? { ...x, amount_laari: e.amount_laari, currency: e.currency, fx_rate_to_mvr: Number(e.fx_rate_to_mvr), mvr_laari: toMvrLaari(e.amount_laari, e.fx_rate_to_mvr), received_at: e.spent_at, note: e.note, keep_in_currency: e.currency !== 'MVR' && e.keep_in_currency } : x)));
    } else if (op === 'deleteDebtPayment' || op === 'updateDebtPayment') {
      const id = op === 'deleteDebtPayment' ? (args as string) : (args as { id: string }).id;
      const before = qc.getQueryData<DebtPayment[]>(['debt-payments'])?.find((x) => x.id === id);
      const next = op === 'updateDebtPayment' ? (args as { amount_laari: number; paid_mvr_laari?: number | null; paid_on: string; note: string | null }) : null;
      const delta = (next?.amount_laari ?? 0) - (before?.amount_laari ?? 0); // how much more has been paid on the debt
      qc.setQueryData<DebtPayment[]>(['debt-payments'], (old) => (next ? old?.map((x) => (x.id === id ? { ...x, amount_laari: next.amount_laari, paid_mvr_laari: next.paid_mvr_laari ?? null, paid_on: next.paid_on, note: next.note } : x)) : old?.filter((x) => x.id !== id)));
      if (before) qc.setQueryData<Debt[]>(['debts'], (old) => old?.map((d) => (d.id === before.debt_id ? { ...d, paid_laari: Math.max(0, d.paid_laari + (next ? delta : -before.amount_laari)), balance_laari: Math.max(0, d.balance_laari - (next ? delta : -before.amount_laari)) } : d)));
    } else if (op === 'setBudget') {
      const a = args as { month: string; categoryId: string | null; limit: number };
      for (const q of qc.getQueryCache().findAll({ queryKey: ['budgets'] })) {
        if ((q.queryKey[1] as string) < a.month) continue; // that month is before the limit starts
        qc.setQueryData<BudgetRow[]>(q.queryKey, (old) => [...(old ?? []).filter((r) => !(r.month === a.month && r.category_id === a.categoryId)), { id: `waiting-${a.month}-${a.categoryId}`, month: a.month, category_id: a.categoryId, limit_laari: a.limit }]);
      }
    } else if (op === 'clearBudget') {
      const { categoryId } = args as { categoryId: string | null };
      qc.setQueriesData<BudgetRow[]>({ queryKey: ['budgets'] }, (old) => old?.filter((r) => r.category_id !== categoryId));
    } else if (op === 'addDebt') {
      const { id, input } = args as { id: string; input: DebtInput };
      prepend(qc, ['debts'], { ...input, id, paid_laari: 0, balance_laari: input.opening_balance_laari, started_on: input.started_on ?? null } as Debt);
    } else if (op === 'updateDebt') {
      const { id, input } = args as { id: string; input: DebtInput };
      qc.setQueryData<Debt[]>(['debts'], (old) => old?.map((d) => (d.id === id ? { ...d, ...input, balance_laari: Math.max(0, input.opening_balance_laari - d.paid_laari) } : d)));
    } else if (op === 'deleteDebt') {
      const id = args as string;
      qc.setQueryData<Debt[]>(['debts'], (old) => old?.filter((d) => d.id !== id));
      qc.setQueryData<DebtPayment[]>(['debt-payments'], (old) => old?.filter((p) => p.debt_id !== id));
    } else if (op === 'addPool') {
      const { id, input } = args as { id: string; input: PoolInput };
      prepend(qc, ['pools'], { ...input, id, started_on: new Date().toISOString().slice(0, 10), ended_on: null } as MoneyPool);
    } else if (op === 'updatePool') {
      const { id, input } = args as { id: string; input: PoolInput };
      qc.setQueryData<MoneyPool[]>(['pools'], (old) => old?.map((p) => (p.id === id ? { ...p, ...input } : p)));
    } else if (op === 'endPool') {
      const id = args as string;
      qc.setQueryData<MoneyPool[]>(['pools'], (old) => old?.map((p) => (p.id === id ? { ...p, ended_on: new Date().toISOString().slice(0, 10) } : p)));
    } else if (op === 'logPoolPayment') {
      const a = args as Parameters<typeof api.logPoolPayment>[0];
      prepend(qc, ['pool-payments'], { id: a.id, pool_id: a.pool_id, expense_id: a.id, period: a.period });
      prepend(qc, ['expenses', monthOf(a.spent_at)], { id: a.id, amount_laari: a.amount_minor, currency: a.currency, fx_rate_to_mvr: Number(a.fx_rate_to_mvr), mvr_laari: toMvrLaari(a.amount_minor, a.fx_rate_to_mvr), category_id: null, merchant: a.name, spent_at: a.spent_at, note: null, source: 'manual', receipt_id: null } as Expense);
    } else if (op === 'addRecurring') {
      const { id, input } = args as { id: string; input: RecurringInput };
      prepend(qc, ['recurring'], { ...input, id, ended_on: null } as RecurringItem);
    } else if (op === 'updateRecurring') {
      const { id, input } = args as { id: string; input: RecurringInput };
      qc.setQueryData<RecurringItem[]>(['recurring'], (old) => old?.map((r) => (r.id === id ? { ...r, ...input } : r)));
    } else if (op === 'endRecurring') {
      const id = args as string;
      qc.setQueryData<RecurringItem[]>(['recurring'], (old) => old?.map((r) => (r.id === id ? { ...r, ended_on: new Date().toISOString().slice(0, 10) } : r)));
    } else if (op === 'skipRecurring') {
      const a = args as { recurring_id: string; occurrence: string };
      prepend(qc, ['recurring-runs'], { id: `skip-${a.recurring_id}-${a.occurrence}`, recurring_id: a.recurring_id, occurrence: a.occurrence, expense_id: null, income_id: null, skipped: true });
    } else if (op === 'logRecurring') {
      const a = args as Parameters<typeof api.logRecurring>[0];
      prepend(qc, ['recurring-runs'], { id: a.id, recurring_id: a.recurring_id, occurrence: a.occurrence, expense_id: a.kind === 'expense' ? a.id : null, income_id: a.kind === 'income' ? a.id : null, skipped: false });
      if (a.kind === 'expense') prepend(qc, ['expenses', monthOf(a.occurrence)], { id: a.id, amount_laari: a.amount_minor, currency: a.currency, fx_rate_to_mvr: Number(a.fx_rate_to_mvr), mvr_laari: toMvrLaari(a.amount_minor, a.fx_rate_to_mvr), category_id: a.category_id, merchant: a.name, spent_at: a.occurrence, note: null, source: 'manual', receipt_id: null } as Expense);
      else prepend(qc, ['income', monthOf(a.occurrence)], { id: a.id, amount_laari: a.amount_minor, currency: a.currency, mvr_laari: toMvrLaari(a.amount_minor, a.fx_rate_to_mvr), received_at: a.occurrence, note: a.name });
    } else if (op === 'deleteConversion') {
      qc.setQueriesData<{ id: string }[]>({ queryKey: ['conversions'] }, (old) => old?.filter((x) => x.id !== (args as string)));
    } else if (op === 'logGiving') {
      const g = args as Parameters<typeof api.logGiving>[0];
      prepend(qc, ['giving', monthOf(g.spent_at)], { id: g.id, expense_id: g.id, kind: g.kind, recipient_note: g.recipient_note, amount_laari: g.amount_laari, spent_at: g.spent_at, commitment_id: g.commitment_id ?? null });
    }
  } catch { /* the entry is still queued; the lists catch up when it is sent */ }
}
