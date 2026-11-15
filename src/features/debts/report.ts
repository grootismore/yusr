import { sum } from '@/lib/money';
import { DEFAULT_USD_RATE, toMvr } from './compute';
import type { Debt, DebtPayment } from './types';

export interface DebtMonth {
  /** Paid by the person themselves this month, in MVR. This is money that left their hands. */
  byYou: number;
  /** Taken from salary by the lender this month, in MVR. It never reached the person, so it is not spending. */
  fromSalary: number;
  /** Still owed across every open debt, in MVR. */
  owed: number;
  /** How many debts are open. */
  open: number;
}

/** What went to debts in a month (`month` is YYYY-MM), and what is still owed. Foreign debts are valued in MVR. */
export function debtMonth(debts: readonly Debt[], payments: readonly DebtPayment[], month: string, savedRates: Record<string, string> = {}): DebtMonth {
  const rate = Number(savedRates.USD) > 0 ? Number(savedRates.USD) : DEFAULT_USD_RATE;
  const rates = { USD: rate };
  const byId = new Map(debts.map((d) => [d.id, d]));
  const inMonth = payments.filter((p) => p.paid_on.startsWith(month));
  const mvr = (p: DebtPayment): number => {
    const d = byId.get(p.debt_id);
    if (!d || d.currency === 'MVR') return p.amount_laari;
    return p.paid_mvr_laari ?? toMvr(p.amount_laari, d.currency, rates);
  };
  const open = debts.filter((d) => d.balance_laari > 0);
  return {
    byYou: sum(inMonth.filter((p) => p.source !== 'auto').map(mvr)),
    fromSalary: sum(inMonth.filter((p) => p.source === 'auto').map(mvr)),
    owed: sum(open.map((d) => toMvr(d.balance_laari, d.currency, rates))),
    open: open.length,
  };
}
