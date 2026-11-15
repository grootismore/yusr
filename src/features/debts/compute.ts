import { sum } from '@/lib/money';
import { dueStatus, type DueState } from './due';
import { minimumDue, planDebts, type PlanResult, type Strategy } from './plan';
import type { Debt, DebtPayment } from './types';

/** Used until the person saves their own rate in Settings. */
export const DEFAULT_USD_RATE = 15.42;

export interface DebtView {
  debt: Debt;
  due: { state: DueState; days: number };
  clearedMonth: string | null;
  /** Balance and this month's minimum in MVR (the same as the debt's own figures for an MVR debt). */
  balanceMvr: number;
  minMvr: number;
  /** What to pay this month in MVR: the minimum, plus the extra budget for the debt being attacked first. */
  suggestedMvr: number;
  /** The debt the extra money goes to this month. */
  focus: boolean;
  /** Loans from people and interest-free debts: minimum only until the others are clear. */
  goodwill: boolean;
  /** The lender takes the instalment from salary: recorded by the app, never part of what the person pays by hand. */
  autoDeducted: boolean;
}
export interface PlanView {
  open: DebtView[]; // debts still owed, in the order to pay them
  paidOff: Debt[];
  total: number; // MVR
  minimums: number; // MVR
  result: PlanResult;
  budget: number;
  /** Rate used for debts owed in USD (MVR per 1 USD), and whether it is the built-in default. */
  usdRate: number;
  usingDefaultRate: boolean;
}

export const isGoodwill = (d: Pick<Debt, 'kind'>): boolean => d.kind === 'personal' || d.kind === 'qard_hasan';
/** Pays its instalment and nothing more: loans from people, and anything the lender takes from salary. */
export const isFixed = (d: Pick<Debt, 'kind' | 'auto_deducted'>): boolean => isGoodwill(d) || d.auto_deducted;

/** A debt's minor-unit amount in MVR laari. 1 cent at a rate of 15.42 is 15.42 laari. */
export const toMvr = (minor: number, currency: string, rates: Record<string, number>): number =>
  currency === 'MVR' ? minor : Math.round(minor * (rates[currency] ?? 1));

/** MVR laari to a debt's currency minor units, at a rate (MVR per 1 unit). */
export const fromMvr = (mvrLaari: number, rate: number): number => Math.round(mvrLaari / rate);

/** What is due on a debt now, in its own currency. */
export const minimumNow = (d: Debt): number => minimumDue({ minPayment: d.min_payment_laari, minPct: d.min_pct_bps }, d.balance_laari);

/** Everything the plan screens show, derived from the debts, payments and the two plan settings. */
export function computePlan(
  debts: readonly Debt[], payments: readonly DebtPayment[], settings: { strategy: Strategy; budgetLaari: number | null }, today: string,
  savedRates: Record<string, string> = {},
): PlanView {
  const month = today.slice(0, 7);
  const usdSaved = Number(savedRates.USD);
  const usdRate = Number.isFinite(usdSaved) && usdSaved > 0 ? usdSaved : DEFAULT_USD_RATE;
  const rates: Record<string, number> = { USD: usdRate };
  const mvr = (minor: number, d: Debt) => toMvr(minor, d.currency, rates);

  const open = debts.filter((d) => d.balance_laari > 0);
  const planned = open.map((d) => ({
    id: d.id, balance: mvr(d.balance_laari, d), minPayment: mvr(d.min_payment_laari, d), minPct: d.min_pct_bps, goodwill: isFixed(d),
    rateBps: d.interest_bearing ? (d.interest_rate_bps ?? 0) : 0, interestBearing: d.interest_bearing,
  }));
  // What comes out of salary is paid anyway: it is not part of the amount the person sets aside, only part of the plan.
  const autoMinimums = sum(planned.filter((p, i) => open[i].auto_deducted).map((p) => minimumDue(p, p.balance)));
  const minimums = sum(planned.map((p) => minimumDue(p, p.balance))) - autoMinimums;
  const result = planDebts(planned, settings.strategy, (settings.budgetLaari ?? minimums) + autoMinimums, month);
  const cleared = new Map(result.payoff.map((p) => [p.id, p.month]));

  // Pay order: debts that are attacked first by the chosen strategy, then loans from people.
  const byId = new Map(planned.map((p) => [p.id, p]));
  const smaller = (a: Debt, b: Debt) => byId.get(a.id)!.balance - byId.get(b.id)!.balance || (a.id < b.id ? -1 : 1);
  const higherRate = (a: Debt, b: Debt) => byId.get(b.id)!.rateBps - byId.get(a.id)!.rateBps || smaller(a, b);
  const pick = settings.strategy === 'snowball' ? smaller : higherRate;
  const ordered = [...open].sort((a, b) => Number(isFixed(a)) - Number(isFixed(b)) || pick(a, b));

  // This month's money: every minimum, then what is left of the budget goes down the order.
  const mins = new Map(ordered.map((d) => [d.id, minimumDue(byId.get(d.id)!, byId.get(d.id)!.balance)]));
  let extra = Math.max(0, result.monthlyBudget - sum([...mins.values()]));
  const suggested = new Map<string, number>();
  for (const d of ordered) {
    const room = d.auto_deducted ? 0 : byId.get(d.id)!.balance - mins.get(d.id)!; // nothing extra goes to a loan taken from salary
    const add = Math.min(extra, room);
    extra -= add;
    suggested.set(d.id, mins.get(d.id)! + add);
  }
  const focusId = ordered.find((d) => (suggested.get(d.id) ?? 0) > (mins.get(d.id) ?? 0))?.id ?? ordered.find((d) => !d.auto_deducted)?.id;

  const views = ordered.map<DebtView>((debt) => ({
    debt,
    clearedMonth: cleared.get(debt.id) ?? null,
    balanceMvr: byId.get(debt.id)!.balance,
    minMvr: mins.get(debt.id)!,
    suggestedMvr: suggested.get(debt.id)!,
    focus: debt.id === focusId,
    goodwill: isGoodwill(debt),
    autoDeducted: debt.auto_deducted,
    due: dueStatus({
      dueDay: debt.due_day, today, minPayment: minimumNow(debt), balance: debt.balance_laari,
      paidThisMonth: sum(payments.filter((p) => p.debt_id === debt.id && p.paid_on.startsWith(month)).map((p) => p.amount_laari)),
    }),
  }));
  return {
    open: views, paidOff: debts.filter((d) => d.balance_laari <= 0), total: sum(planned.map((p) => p.balance)), minimums, result, budget: result.monthlyBudget,
    usdRate, usingDefaultRate: !(Number.isFinite(usdSaved) && usdSaved > 0),
  };
}

/** The most pressing due item: overdue first, then soonest. */
export function nextDue(view: PlanView): DebtView | undefined {
  return view.open.filter((v) => v.due.state === 'overdue' || v.due.state === 'due_soon')
    .sort((a, b) => (a.due.state === b.due.state ? a.due.days - b.due.days : a.due.state === 'overdue' ? -1 : 1))[0];
}
