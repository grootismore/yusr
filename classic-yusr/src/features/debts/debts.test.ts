import type { Transaction } from '@/features/transactions/types';
import {
  currentBalance,
  nextDueDate,
  paidInMonth,
  planInput,
  startingBalanceFor,
  totalOwed,
  totalReceivable,
} from './logic';
import { MAX_MONTHS, monthlyInterest, planDebts, type PlanDebt, type Strategy } from './plan';
import type { Debt, Receivable } from './types';

const debt = (over: Partial<Debt> = {}): Debt => ({
  id: 'd1', user_id: 'u', lender: 'BML', kind: 'bank', original_laari: 200000, balance_laari: 100000,
  min_payment_laari: 10000, due_day: 15, is_interest_bearing: false, interest_rate_bps: null,
  reference_secret_id: null, notes_secret_id: null, created_at: '', updated_at: '', deleted_at: null, ...over,
});
let n = 0;
const payment = (debtId: string, amount: number, on = '2026-11-05', over: Partial<Transaction> = {}): Transaction => {
  n += 1;
  return {
    id: `p${n}`, user_id: 'u', account_id: 'a', category_id: 'c', amount_laari: amount, kind: 'expense',
    occurred_on: on, note: null, debt_id: debtId, commitment_id: null, created_at: '', updated_at: '', deleted_at: null, ...over,
  };
};

describe('derived debt balance', () => {
  it('is the starting balance minus live payments, floored at zero', () => {
    const tx = [payment('d1', 30000), payment('d1', 20000), payment('other', 99999), payment('d1', 5000, '2026-11-06', { deleted_at: 'x' })];
    expect(currentBalance(debt(), tx)).toBe(50000);
    expect(currentBalance(debt(), [payment('d1', 150000)])).toBe(0); // overpaid never shows negative
  });
  it('lets the user correct the balance without drift', () => {
    const tx = [payment('d1', 30000)];
    const start = startingBalanceFor(80000, 'd1', tx); // "I really owe 800.00 now"
    expect(currentBalance(debt({ balance_laari: start }), tx)).toBe(80000);
    // a later payment reduces from the corrected figure
    expect(currentBalance(debt({ balance_laari: start }), [...tx, payment('d1', 10000)])).toBe(70000);
  });
  it('totals what is owed and what is owed to the user, ignoring archived rows', () => {
    const debts = [debt(), debt({ id: 'd2', balance_laari: 50000 }), debt({ id: 'd3', balance_laari: 999, deleted_at: 'x' })];
    expect(totalOwed(debts, [])).toBe(150000);
    const r = (amount: number, deleted_at: string | null = null): Receivable => ({
      id: String(amount), user_id: 'u', debtor: 'x', amount_laari: amount, due_on: null, notes: null, created_at: '', updated_at: '', deleted_at,
    });
    expect(totalReceivable([r(100), r(250), r(9999, 'x')])).toBe(350);
  });
  it('sums payments in a month only', () => {
    const tx = [payment('d1', 100, '2026-11-01'), payment('d1', 200, '2026-11-30'), payment('d1', 400, '2026-10-31')];
    expect(paidInMonth('d1', tx, '2026-11')).toBe(300);
  });
  it('feeds the planner only debts that still have a balance', () => {
    const input = planInput([debt(), debt({ id: 'd2', balance_laari: 5000 }), debt({ id: 'd3', deleted_at: 'x' })], [payment('d2', 5000)]);
    expect(input.map((d) => d.id)).toEqual(['d1']);
    expect(input[0]).toMatchObject({ balance: 100000, minPayment: 10000, rateBps: 0, interestBearing: false });
  });
});

describe('nextDueDate', () => {
  it.each([
    [15, '2026-11-01', '2026-11-15'],
    [15, '2026-11-15', '2026-11-15'], // due today
    [15, '2026-11-16', '2026-12-15'],
    [31, '2026-02-10', '2026-02-28'], // clamps to the short month
    [31, '2028-02-10', '2028-02-29'], // leap year
    [31, '2026-04-30', '2026-04-30'],
    [10, '2026-12-20', '2027-01-10'], // wraps the year
    [null, '2026-11-01', null],
  ])('day %s from %s is %s', (dueDay, today, expected) => {
    expect(nextDueDate(dueDay as number | null, today)).toBe(expected);
  });
});

describe('monthlyInterest', () => {
  it('is balance x annual rate / 12, rounded half up, in integers', () => {
    expect(monthlyInterest(100000, 1200)).toBe(1000); // 12% a year on 1,000.00 = 10.00 a month
    expect(monthlyInterest(100001, 1200)).toBe(1000); // 1000.01 rounds down
    expect(monthlyInterest(100050, 1200)).toBe(1001); // 1000.50 rounds up
    expect(monthlyInterest(0, 1200)).toBe(0);
    expect(monthlyInterest(100000, 0)).toBe(0);
  });
  it('does not overflow on very large balances', () => {
    const balance = Number.MAX_SAFE_INTEGER;
    const expected = Number((BigInt(balance) * BigInt(100000) + BigInt(60000)) / BigInt(120000));
    expect(monthlyInterest(balance, 100000)).toBe(expected);
  });
});

const D = (id: string, balance: number, minPayment: number, rateBps = 0, interestBearing = rateBps > 0): PlanDebt => ({
  id, balance, minPayment, rateBps, interestBearing,
});

describe('planDebts', () => {
  it('has nothing to do without debts', () => {
    expect(planDebts([], 'snowball', 50000, '2026-11')).toMatchObject({ months: 0, debtFreeMonth: null, neverPaysOff: false });
    expect(planDebts([D('a', 0, 100)], 'snowball', 50000, '2026-11').months).toBe(0);
  });
  it('clears a single interest-free debt on the minimum and names the month', () => {
    const plan = planDebts([D('a', 100000, 25000)], 'snowball', 0, '2026-11');
    expect(plan).toMatchObject({ months: 4, debtFreeMonth: '2027-03', totalInterest: 0, totalPaid: 100000, raisedToMinimums: true, monthlyBudget: 25000 });
    expect(plan.payoff).toEqual([{ id: 'a', month: '2027-03' }]);
  });
  it('rolls freed-up minimums into the next debt', () => {
    // budget 40,000: B (50,000) is cleared first, then its 10,000 minimum joins A's payments.
    const plan = planDebts([D('a', 100000, 10000), D('b', 50000, 10000)], 'snowball', 40000, '2026-11');
    expect(plan.payoff.map((p) => p.id)).toEqual(['b', 'a']);
    expect(plan.totalPaid).toBe(150000);
    expect(plan.months).toBe(4);
  });
  it('orders by strategy: snowball by size, avalanche by rate, riba-first by interest', () => {
    const debts = [D('big-rate', 200000, 5000, 2400), D('small-free', 40000, 5000), D('mid-rate', 100000, 5000, 600)];
    const first = (s: Strategy) => planDebts(debts, s, 30000, '2026-11').payoff[0].id;
    expect(first('snowball')).toBe('small-free');
    expect(first('avalanche')).toBe('small-free'); // finishes first because it is small, but extra went to big-rate
    const order = (s: Strategy) => planDebts(debts, s, 30000, '2026-11').payoff.map((p) => p.id);
    expect(order('avalanche').indexOf('big-rate')).toBeLessThan(order('snowball').indexOf('big-rate'));
    // Riba-first sends the extra money to the interest-bearing debts, so they clear sooner and the
    // interest-free debt later than under snowball (which puts all the extra on the smallest debt).
    const month = (s: Strategy, id: string) => planDebts(debts, s, 30000, '2026-11').payoff.find((p) => p.id === id)?.month ?? '';
    expect(month('riba_first', 'big-rate') < month('snowball', 'big-rate')).toBe(true);
    expect(month('riba_first', 'small-free') > month('snowball', 'small-free')).toBe(true);
  });
  it('avalanche never pays more interest than snowball on the same debts', () => {
    const debts = [D('a', 300000, 8000, 2400), D('b', 80000, 4000, 300), D('c', 150000, 6000)];
    const interest = (s: Strategy) => planDebts(debts, s, 40000, '2026-11').totalInterest;
    expect(interest('avalanche')).toBeLessThanOrEqual(interest('snowball'));
    expect(interest('avalanche')).toBeLessThanOrEqual(interest('riba_first'));
  });
  it('raises a too-small budget to the minimums and says so', () => {
    const plan = planDebts([D('a', 100000, 20000), D('b', 100000, 30000)], 'snowball', 10000, '2026-11');
    expect(plan.raisedToMinimums).toBe(true);
    expect(plan.monthlyBudget).toBe(50000);
  });
  it('reports a plan that cannot catch up with interest as never finishing', () => {
    const plan = planDebts([D('a', 100000, 5000, 12000)], 'snowball', 5000, '2026-11'); // 10% a month vs 5% paid
    expect(plan).toMatchObject({ neverPaysOff: true, debtFreeMonth: null, months: MAX_MONTHS });
  });
  it('does not overflow when interest grows without bound', () => {
    const plan = planDebts([D('a', Math.floor(Number.MAX_SAFE_INTEGER / 4), 1, 100000)], 'snowball', 1, '2026-11');
    expect(plan.neverPaysOff).toBe(true);
    expect(plan.debtFreeMonth).toBeNull();
    expect(() => planDebts([D('a', 100000, 5000, 100000)], 'snowball', 5000, '2026-11')).not.toThrow();
  });
  it('is deterministic', () => {
    const debts = [D('a', 123457, 7000, 1850), D('b', 98765, 6000, 1850), D('c', 5555, 500)];
    expect(planDebts(debts, 'avalanche', 25000, '2026-11')).toEqual(planDebts(debts, 'avalanche', 25000, '2026-11'));
  });

  it('holds its invariants over 300 pseudo-random scenarios', () => {
    let seed = 12345;
    const rand = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    let finished = 0;
    for (let i = 0; i < 300; i++) {
      const count = 1 + rand(4);
      const debts = Array.from({ length: count }, (_, k) => {
        const rate = rand(3) === 0 ? 0 : rand(3000);
        return D(`d${k}`, 1000 + rand(2_000_000), rand(30_000), rate);
      });
      const budget = rand(120_000);
      const strategy = (['snowball', 'avalanche', 'riba_first'] as const)[rand(3)];
      const plan = planDebts(debts, strategy, budget, '2026-11');
      const start = debts.reduce((total, d) => total + d.balance, 0);

      expect(plan.monthlyBudget).toBeGreaterThanOrEqual(budget);
      expect(plan.totalPaid).toBeLessThanOrEqual(plan.monthlyBudget * plan.months);
      expect(Number.isInteger(plan.totalPaid) && Number.isInteger(plan.totalInterest)).toBe(true);
      expect(plan.totals.every((t) => t >= 0)).toBe(true);
      if (!plan.neverPaysOff) {
        finished++;
        // Money in = money out: everything borrowed plus interest was paid, exactly.
        expect(plan.totalPaid).toBe(start + plan.totalInterest);
        expect(plan.totals[plan.totals.length - 1]).toBe(0);
        expect(plan.payoff).toHaveLength(count);
        expect(plan.debtFreeMonth).not.toBeNull();
      }
    }
    expect(finished).toBeGreaterThan(100); // the scenarios actually exercise finishing plans
  });
});
