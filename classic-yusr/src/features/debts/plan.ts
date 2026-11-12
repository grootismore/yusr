import { add, sum } from '@/lib/money';
import { shiftMonth } from '@/features/transactions/logic';

export const STRATEGIES = ['snowball', 'avalanche', 'riba_first'] as const;
export type Strategy = (typeof STRATEGIES)[number];

export interface PlanDebt {
  id: string;
  /** Current balance in laari. */
  balance: number;
  minPayment: number;
  /** Annual interest rate in basis points; 0 when unknown or interest-free. */
  rateBps: number;
  interestBearing: boolean;
}

export interface PlanResult {
  /** Months of payments until every debt is cleared (0 when there is nothing to pay). */
  months: number;
  /** YYYY-MM of the final payment, or null if the plan never clears the debts. */
  debtFreeMonth: string | null;
  neverPaysOff: boolean;
  totalInterest: number;
  totalPaid: number;
  /** The order debts reach zero, with the month each is cleared. */
  payoff: { id: string; month: string }[];
  /** The monthly amount actually used (never below the sum of minimums). */
  monthlyBudget: number;
  /** True when the requested budget was below the minimums and was raised to them. */
  raisedToMinimums: boolean;
  /** Total remaining balance at the end of each month. */
  totals: number[];
}

/** 50 years: a plan that has not finished by then is treated as never finishing. */
export const MAX_MONTHS = 600;

/**
 * If interest outruns payments the balance grows exponentially. Past this (10 trillion MVR, in laari)
 * the plan is declared "never finishes" before the arithmetic leaves the safe-integer range.
 */
const RUNAWAY = 1e15;

/** One month of interest on `balance` at an annual `rateBps`, rounded half up, without overflow. */
export function monthlyInterest(balance: number, rateBps: number): number {
  if (balance <= 0 || rateBps <= 0) return 0;
  // balance * rateBps / (10_000 * 12); BigInt because the product can exceed 2^53.
  const numerator = BigInt(balance) * BigInt(rateBps) + BigInt(60_000);
  return Number(numerator / BigInt(120_000));
}

interface Work extends PlanDebt {
  left: number;
}

/** Which debt gets the extra money first. Deterministic: ties fall back to id. */
function byStrategy(strategy: Strategy) {
  const smaller = (a: Work, b: Work) => a.left - b.left || (a.id < b.id ? -1 : 1);
  const higherRate = (a: Work, b: Work) => b.rateBps - a.rateBps || smaller(a, b);
  return (a: Work, b: Work): number => {
    if (strategy === 'snowball') return smaller(a, b);
    if (strategy === 'avalanche') return higherRate(a, b);
    // riba_first: interest-bearing debt before interest-free, highest rate first within it.
    if (a.interestBearing !== b.interestBearing) return a.interestBearing ? -1 : 1;
    return a.interestBearing ? higherRate(a, b) : smaller(a, b);
  };
}

/**
 * Month-by-month payoff simulation. Payments start the month after `startMonth`.
 * Each month: interest accrues, every debt gets its minimum, and the rest of a fixed
 * monthly budget goes to the debt the strategy picks (so freed-up minimums roll over).
 */
export function planDebts(
  debts: readonly PlanDebt[],
  strategy: Strategy,
  requestedBudget: number,
  startMonth: string,
): PlanResult {
  const work: Work[] = debts.filter((d) => d.balance > 0).map((d) => ({ ...d, left: d.balance }));
  const minimums = sum(work.map((d) => d.minPayment));
  const monthlyBudget = Math.max(requestedBudget, minimums);
  const result: PlanResult = {
    months: 0,
    debtFreeMonth: null,
    neverPaysOff: false,
    totalInterest: 0,
    totalPaid: 0,
    payoff: [],
    monthlyBudget,
    raisedToMinimums: requestedBudget < minimums,
    totals: [],
  };
  if (work.length === 0) return result;

  const neverFinishes = (): PlanResult => ({
    ...result,
    months: MAX_MONTHS,
    debtFreeMonth: null,
    neverPaysOff: true,
    payoff: result.payoff.filter((p) => work.find((d) => d.id === p.id)?.left === 0),
  });

  const order = byStrategy(strategy);
  for (let month = 1; month <= MAX_MONTHS; month++) {
    if (sum(work.map((d) => d.left)) > RUNAWAY) return neverFinishes();
    const active = work.filter((d) => d.left > 0);
    for (const d of active) {
      const interest = monthlyInterest(d.left, d.rateBps);
      d.left = add(d.left, interest);
      result.totalInterest = add(result.totalInterest, interest);
    }

    let remaining = monthlyBudget;
    const pay = (d: Work, wanted: number) => {
      const amount = Math.min(wanted, d.left, remaining);
      d.left -= amount;
      remaining -= amount;
      result.totalPaid = add(result.totalPaid, amount);
    };
    for (const d of active) pay(d, d.minPayment);
    for (const d of [...active].sort(order)) pay(d, d.left);

    const label = shiftMonth(startMonth, month);
    for (const d of active) {
      if (d.left === 0) result.payoff.push({ id: d.id, month: label });
    }
    result.totals.push(sum(work.map((d) => d.left)));

    if (work.every((d) => d.left === 0)) {
      result.months = month;
      result.debtFreeMonth = label;
      return result;
    }
  }
  return neverFinishes();
}
