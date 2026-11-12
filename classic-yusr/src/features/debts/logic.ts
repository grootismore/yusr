import { add, subtract, sum } from '@/lib/money';
import type { Transaction } from '@/features/transactions/types';
import type { PlanDebt } from './plan';
import type { Debt, Receivable } from './types';

/** Live payments logged against a debt. */
export const debtPayments = (debtId: string, transactions: readonly Transaction[]): Transaction[] =>
  transactions.filter((t) => t.debt_id === debtId && t.deleted_at === null);

export const paidTotal = (debtId: string, transactions: readonly Transaction[]): number =>
  sum(debtPayments(debtId, transactions).map((t) => t.amount_laari));

/** Derived, never stored: balance when tracking started minus payments (floored at zero). */
export function currentBalance(debt: Debt, transactions: readonly Transaction[]): number {
  return Math.max(0, subtract(debt.balance_laari, paidTotal(debt.id, transactions)));
}

/**
 * When the user corrects "what I owe now", store the starting balance that makes the
 * derived current balance equal what they typed.
 */
export const startingBalanceFor = (wantedCurrent: number, debtId: string, transactions: readonly Transaction[]): number =>
  add(wantedCurrent, paidTotal(debtId, transactions));

export function paidInMonth(debtId: string, transactions: readonly Transaction[], month: string): number {
  return sum(
    debtPayments(debtId, transactions)
      .filter((t) => t.occurred_on.startsWith(month))
      .map((t) => t.amount_laari),
  );
}

/** Next date (today or later) a debt is due, clamping day 31 to short months. Null when no due day. */
export function nextDueDate(dueDay: number | null, todayIso: string): string | null {
  if (dueDay === null) return null;
  const [year, month] = todayIso.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const inMonth = (y: number, m: number) => {
    const last = new Date(y, m, 0).getDate();
    return `${y}-${pad(m)}-${pad(Math.min(dueDay, last))}`;
  };
  const thisMonth = inMonth(year, month);
  if (thisMonth >= todayIso) return thisMonth;
  return month === 12 ? inMonth(year + 1, 1) : inMonth(year, month + 1);
}

export const totalOwed = (debts: readonly Debt[], transactions: readonly Transaction[]): number =>
  sum(debts.filter((d) => d.deleted_at === null).map((d) => currentBalance(d, transactions)));

export const totalReceivable = (receivables: readonly Receivable[]): number =>
  sum(receivables.filter((r) => r.deleted_at === null).map((r) => r.amount_laari));

/** Debts still being paid, in the shape the payoff planner needs. */
export function planInput(debts: readonly Debt[], transactions: readonly Transaction[]): PlanDebt[] {
  return debts
    .filter((d) => d.deleted_at === null)
    .map((d) => ({
      id: d.id,
      balance: currentBalance(d, transactions),
      minPayment: d.min_payment_laari,
      rateBps: d.is_interest_bearing ? (d.interest_rate_bps ?? 0) : 0,
      interestBearing: d.is_interest_bearing,
    }))
    .filter((d) => d.balance > 0);
}
