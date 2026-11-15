import { dueDateThisMonth, dueStatus } from '@/features/debts/due';
import { minimumDue, monthlyInterest, planDebts, type PlanDebt } from '@/features/debts/plan';

import { computePlan, fromMvr, isGoodwill, minimumNow, nextDue } from '@/features/debts/compute';
import type { Debt } from '@/features/debts/types';

const d = (id: string, balance: number, rateBps: number, minPayment: number): PlanDebt => ({ id, balance, rateBps, minPayment, interestBearing: rateBps > 0 });

describe('payoff plan', () => {
  const debts = [d('small', 100_000, 0, 10_000), d('big', 1_000_000, 2400, 20_000), d('mid', 500_000, 1200, 15_000)];

  it('interest is exact integer laari, rounded half up', () => {
    expect(monthlyInterest(1_000_000, 1200)).toBe(10_000); // 12% a year = 1% a month
    expect(monthlyInterest(1, 1200)).toBe(0);
    expect(monthlyInterest(5_000, 1200)).toBe(50);
    expect(monthlyInterest(Number.MAX_SAFE_INTEGER, 20000)).toBeGreaterThan(0); // no overflow
  });

  it('snowball clears the smallest balance first, avalanche the highest rate', () => {
    const snow = planDebts(debts, 'snowball', 200_000, '2026-11');
    const aval = planDebts(debts, 'avalanche', 200_000, '2026-11');
    expect(snow.payoff[0].id).toBe('small');
    expect(aval.totalInterest).toBeLessThanOrEqual(snow.totalInterest);
    expect(snow.debtFreeMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(snow.neverPaysOff).toBe(false);
  });

  it('with equal balances avalanche goes to the higher rate, snowball falls back to id', () => {
    const tied = [d('a', 500_000, 0, 10_000), d('b', 500_000, 2400, 10_000)];
    expect(planDebts(tied, 'avalanche', 100_000, '2026-11').payoff[0].id).toBe('b');
    expect(planDebts(tied, 'snowball', 100_000, '2026-11').payoff[0].id).toBe('a');
  });

  it('freed-up minimums roll into the next debt, and every laari is accounted for', () => {
    const r = planDebts(debts, 'snowball', 200_000, '2026-11');
    const start = debts.reduce((s, x) => s + x.balance, 0);
    expect(r.totalPaid).toBe(start + r.totalInterest);
    expect(r.totals[r.totals.length - 1]).toBe(0);
  });

  it('a budget below the minimums is raised to them and says so', () => {
    const r = planDebts(debts, 'snowball', 1, '2026-11');
    expect(r.raisedToMinimums).toBe(true);
    expect(r.monthlyBudget).toBe(45_000);
  });

  it('a payment that cannot outrun the interest never finishes', () => {
    const r = planDebts([d('x', 1_000_000, 3600, 1_000)], 'snowball', 1_000, '2026-11');
    expect(r.neverPaysOff).toBe(true);
    expect(r.debtFreeMonth).toBeNull();
  });

  it('nothing owed means debt-free now', () => {
    expect(planDebts([], 'snowball', 0, '2026-11')).toMatchObject({ months: 0, neverPaysOff: false, debtFreeMonth: null });
  });

  it('is deterministic when balances tie', () => {
    const a = planDebts([d('b', 100, 0, 100), d('a', 100, 0, 100)], 'snowball', 200, '2026-11');
    expect(a.payoff.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });
});

describe('due status', () => {
  const base = { dueDay: 10, paidThisMonth: 0, minPayment: 20_000, balance: 100_000 };
  it('overdue once the day has passed without a payment', () => expect(dueStatus({ ...base, today: '2026-11-13' })).toEqual({ state: 'overdue', days: 3 }));
  it('due soon within a week', () => expect(dueStatus({ ...base, today: '2026-11-05' })).toEqual({ state: 'due_soon', days: 5 }));
  it('ok when it is far off', () => expect(dueStatus({ ...base, today: '2026-11-01' }).state).toBe('ok'));
  it('a payment of at least the minimum settles the month', () => expect(dueStatus({ ...base, today: '2026-11-13', paidThisMonth: 20_000 }).state).toBe('ok'));
  it('a smaller payment does not', () => expect(dueStatus({ ...base, today: '2026-11-13', paidThisMonth: 5_000 }).state).toBe('overdue'));
  it('no minimum: any payment settles it', () => expect(dueStatus({ ...base, minPayment: 0, today: '2026-11-13', paidThisMonth: 1 }).state).toBe('ok'));
  it('paid off and no due day', () => {
    expect(dueStatus({ ...base, balance: 0, today: '2026-11-13' }).state).toBe('paid');
    expect(dueStatus({ ...base, dueDay: null, today: '2026-11-13' }).state).toBe('none');
  });
  it('day 31 is clamped to short months', () => {
    expect(dueDateThisMonth(31, '2026-02-10')).toBe('2026-02-28');
    expect(dueStatus({ ...base, dueDay: 31, today: '2026-02-27' })).toEqual({ state: 'due_soon', days: 1 });
  });
});

const debt = (o: Partial<Debt> & { id: string }): Debt => ({ lender: o.id, kind: 'loan', opening_balance_laari: 100_000, balance_laari: 100_000, paid_laari: 0, min_payment_laari: 10_000, min_pct_bps: null, currency: 'MVR', due_day: null, interest_bearing: false, interest_rate_bps: null, started_on: null, in_register: true, notes: null, ...o });

describe('computePlan', () => {
  const debts = [debt({ id: 'a', balance_laari: 300_000, due_day: 10 }), debt({ id: 'b', balance_laari: 50_000, due_day: 20 }), debt({ id: 'done', balance_laari: 0 })];
  it('orders by when each is cleared and separates settled debts', () => {
    const v = computePlan(debts, [], { strategy: 'snowball', budgetLaari: null }, '2026-11-13');
    expect(v.open.map((x) => x.debt.id)).toEqual(['b', 'a']);
    expect(v.paidOff.map((d) => d.id)).toEqual(['done']);
    expect(v.total).toBe(350_000);
    expect(v.budget).toBe(20_000); // defaults to the minimums
  });
  it('uses this month\'s payments for the due state and picks the most pressing item', () => {
    const none = computePlan(debts, [], { strategy: 'snowball', budgetLaari: null }, '2026-11-13');
    expect(nextDue(none)?.debt.id).toBe('a'); // 3 days overdue
    const paid = computePlan(debts, [{ id: 'p', debt_id: 'a', amount_laari: 10_000, paid_mvr_laari: null, paid_on: '2026-11-02', note: null }], { strategy: 'snowball', budgetLaari: null }, '2026-11-13');
    expect(nextDue(paid)?.debt.id).toBe('b'); // a is settled for the month, b is due in 7 days
  });
  it('an old payment does not settle this month', () => {
    const v = computePlan(debts, [{ id: 'p', debt_id: 'a', amount_laari: 10_000, paid_mvr_laari: null, paid_on: '2026-10-02', note: null }], { strategy: 'snowball', budgetLaari: null }, '2026-11-13');
    expect(v.open.find((x) => x.debt.id === 'a')?.due.state).toBe('overdue');
  });
});


describe('minimums, USD debts and the order', () => {
  it('a percentage minimum is a share of the balance but never below the floor or above the balance', () => {
    expect(minimumDue({ minPayment: 10_000, minPct: 500 }, 1_000_000)).toBe(50_000); // 5% of MVR 10,000
    expect(minimumDue({ minPayment: 10_000, minPct: 500 }, 100_000)).toBe(10_000); // floor
    expect(minimumDue({ minPayment: 10_000, minPct: 500 }, 4_000)).toBe(4_000); // never more than is owed
    expect(minimumDue({ minPayment: 25_000, minPct: null }, 1_000_000)).toBe(25_000);
  });
  it('minimumNow follows the balance as it falls', () => {
    const card = debt({ id: 'c', balance_laari: 30_000, min_payment_laari: 1_000, min_pct_bps: 500 });
    expect(minimumNow(card)).toBe(1_500);
    expect(minimumNow({ ...card, balance_laari: 10_000 })).toBe(1_000);
  });
  it('a USD card is planned in MVR at the saved rate, and paid in MVR', () => {
    const card = debt({ id: 'usd', currency: 'USD', balance_laari: 60_000, min_payment_laari: 1_000, min_pct_bps: 500, interest_bearing: true, interest_rate_bps: 2400 }); // USD 600
    const v = computePlan([card], [], { strategy: 'avalanche', budgetLaari: null }, '2026-11-13', { USD: '15.50' });
    expect(v.open[0].balanceMvr).toBe(930_000); // USD 600 at 15.50
    expect(v.open[0].minMvr).toBe(46_500); // 5% of MVR 9,300
    expect(v.usdRate).toBe(15.5);
    expect(v.usingDefaultRate).toBe(false);
    expect(computePlan([card], [], { strategy: 'avalanche', budgetLaari: null }, '2026-11-13').usingDefaultRate).toBe(true);
    expect(fromMvr(100_000, 15.42)).toBe(6_485); // MVR 1,000 at 15.42 takes USD 64.85 off
  });
  it('the extra budget goes to the debt the strategy picks first; loans from people only get their minimum', () => {
    const debts = [
      debt({ id: 'friend', kind: 'personal', balance_laari: 20_000, min_payment_laari: 5_000 }),
      debt({ id: 'bank', balance_laari: 500_000, min_payment_laari: 10_000, interest_bearing: true, interest_rate_bps: 1500 }),
      debt({ id: 'card', balance_laari: 800_000, min_payment_laari: 10_000, interest_bearing: true, interest_rate_bps: 2400 }),
    ];
    const aval = computePlan(debts, [], { strategy: 'avalanche', budgetLaari: 100_000 }, '2026-11-13');
    expect(aval.open.map((x) => x.debt.id)).toEqual(['card', 'bank', 'friend']);
    expect(aval.open[0].focus).toBe(true);
    expect(aval.open[0].suggestedMvr).toBe(85_000); // 100,000 − 10,000 − 5,000 of minimums, on top of its own 10,000
    expect(aval.open.find((x) => x.debt.id === 'friend')!.suggestedMvr).toBe(5_000);
    const snow = computePlan(debts, [], { strategy: 'snowball', budgetLaari: 100_000 }, '2026-11-13');
    expect(snow.open.map((x) => x.debt.id)).toEqual(['bank', 'card', 'friend']);
    expect(isGoodwill({ kind: 'qard_hasan' })).toBe(true);
  });
});
