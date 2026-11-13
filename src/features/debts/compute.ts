import { sum } from '@/lib/money';
import { dueStatus, type DueState } from './due';
import { planDebts, type PlanResult, type Strategy } from './plan';
import type { Debt, DebtPayment } from './types';

export interface DebtView { debt: Debt; due: { state: DueState; days: number }; clearedMonth: string | null }
export interface PlanView {
  open: DebtView[]; // debts still owed, in payoff order
  paidOff: Debt[];
  total: number;
  minimums: number;
  result: PlanResult;
  budget: number;
}

/** Everything the plan screens show, derived from the debts, payments and the two plan settings. */
export function computePlan(debts: readonly Debt[], payments: readonly DebtPayment[], settings: { strategy: Strategy; budgetLaari: number | null }, today: string): PlanView {
  const month = today.slice(0, 7);
  const open = debts.filter((d) => d.balance_laari > 0);
  const minimums = sum(open.map((d) => d.min_payment_laari));
  const result = planDebts(
    open.map((d) => ({ id: d.id, balance: d.balance_laari, minPayment: d.min_payment_laari, rateBps: d.interest_bearing ? (d.interest_rate_bps ?? 0) : 0, interestBearing: d.interest_bearing })),
    settings.strategy, settings.budgetLaari ?? minimums, month,
  );
  const cleared = new Map(result.payoff.map((p, i) => [p.id, { month: p.month, i }]));
  const views = open.map<DebtView>((debt) => ({
    debt,
    clearedMonth: cleared.get(debt.id)?.month ?? null,
    due: dueStatus({
      dueDay: debt.due_day, today, minPayment: debt.min_payment_laari, balance: debt.balance_laari,
      paidThisMonth: sum(payments.filter((p) => p.debt_id === debt.id && p.paid_on.startsWith(month)).map((p) => p.amount_laari)),
    }),
  }));
  // Plan order: the order they reach zero; anything that never clears goes last, smallest first.
  views.sort((a, b) => (cleared.get(a.debt.id)?.i ?? Infinity) - (cleared.get(b.debt.id)?.i ?? Infinity) || a.debt.balance_laari - b.debt.balance_laari);
  return { open: views, paidOff: debts.filter((d) => d.balance_laari <= 0), total: sum(open.map((d) => d.balance_laari)), minimums, result, budget: result.monthlyBudget };
}

/** The most pressing due item: overdue first, then soonest. */
export function nextDue(view: PlanView): DebtView | undefined {
  return view.open.filter((v) => v.due.state === 'overdue' || v.due.state === 'due_soon')
    .sort((a, b) => (a.due.state === b.due.state ? a.due.days - b.due.days : a.due.state === 'overdue' ? -1 : 1))[0];
}
