import type { Debt } from '@/features/debts/types';
import type { Commitment } from '@/features/giving/types';
import { safeToSpend, upcomingItems } from './budget';
import { dueDatesBetween, nextDueAfter } from './recurring';
import type { RecurringItem, Transaction } from './types';

const TODAY = '2026-11-10'; // a Tuesday; Fridays left in November: 13, 20, 27
const stamp = { created_at: '', updated_at: '', deleted_at: null };
let n = 0;
const tx = (over: Partial<Transaction>): Transaction => {
  n += 1;
  return {
    id: `t${n}`, user_id: 'u', account_id: 'a', category_id: 'c', amount_laari: 100, kind: 'expense', occurred_on: TODAY,
    note: null, debt_id: null, commitment_id: null, ...stamp, ...over,
  };
};
const debt = (over: Partial<Debt> = {}): Debt => ({
  id: 'd1', user_id: 'u', lender: 'BML', kind: 'bank', original_laari: 500000, balance_laari: 100000, min_payment_laari: 10000,
  due_day: 20, is_interest_bearing: false, interest_rate_bps: null, reference_secret_id: null, notes_secret_id: null, ...stamp, ...over,
});
const friday = (over: Partial<Commitment> = {}): Commitment => ({
  id: 'g1', user_id: 'u', type: 'sadaqah', amount_laari: 2000, schedule: 'weekly_friday', due_on: null, day_of_month: null,
  recipient_note: null, reminder_enabled: true, active: true, ...stamp, ...over,
});
const bill = (over: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'r1', user_id: 'u', name: 'Rent', kind: 'expense', amount_laari: 30000, category_id: 'c', account_id: 'a',
  schedule: 'monthly', day_of_month: 25, weekday: null, next_due_on: '2026-11-25', active: true, ...stamp, ...over,
});
const base = { today: TODAY, transactions: [] as Transaction[], debts: [] as Debt[], commitments: [] as Commitment[], recurring: [] as RecurringItem[] };

describe('recurring schedules', () => {
  it('finds the next date strictly after a given one', () => {
    const rent = { schedule: 'monthly' as const, day_of_month: 25, weekday: null };
    expect(nextDueAfter(rent, '2026-11-10')).toBe('2026-11-25');
    expect(nextDueAfter(rent, '2026-11-25')).toBe('2026-12-25'); // strictly after
    expect(nextDueAfter(rent, '2026-12-30')).toBe('2027-01-25');
    expect(nextDueAfter({ schedule: 'monthly', day_of_month: 31, weekday: null }, '2026-01-31')).toBe('2026-02-28'); // clamps
    const weekly = { schedule: 'weekly' as const, day_of_month: null, weekday: 5 };
    expect(nextDueAfter(weekly, '2026-11-06')).toBe('2026-11-13'); // a Friday: next week
    expect(nextDueAfter(weekly, '2026-11-07')).toBe('2026-11-13');
    expect(nextDueAfter(weekly, '2026-11-09')).toBe('2026-11-13');
  });
  it('lists every date a bill falls due inside a window, from its next unlogged date', () => {
    expect(dueDatesBetween(bill({ schedule: 'weekly', day_of_month: null, weekday: 5, next_due_on: '2026-11-06' }), '2026-11-01', '2026-11-30'))
      .toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']);
    expect(dueDatesBetween(bill(), '2026-11-01', '2026-11-30')).toEqual(['2026-11-25']);
    expect(dueDatesBetween(bill({ next_due_on: '2026-12-25' }), '2026-11-01', '2026-11-30')).toEqual([]); // already logged
    // an old unlogged date does not count towards this month's window
    expect(dueDatesBetween(bill({ next_due_on: '2026-09-25' }), '2026-11-01', '2026-11-30')).toEqual(['2026-11-25']);
  });
});

describe('safe to spend', () => {
  it('is income minus spending when nothing is reserved', () => {
    const r = safeToSpend({ ...base, transactions: [tx({ kind: 'income', amount_laari: 100000 }), tx({ amount_laari: 20000 }), tx({ kind: 'giving', amount_laari: 5000 })] });
    expect(r).toMatchObject({ income: 100000, spent: 25000, safeToSpend: 75000, reservedDebts: 0, reservedGiving: 0, reservedBills: 0 });
  });

  it('sets aside debt minimums, then giving, then bills, in that order of reporting', () => {
    const r = safeToSpend({
      ...base,
      transactions: [tx({ kind: 'income', amount_laari: 100000 })],
      debts: [debt()],
      commitments: [friday()],
      recurring: [bill()],
    });
    expect(r.reservedDebts).toBe(10000);
    expect(r.reservedGiving).toBe(6000); // Fridays 13, 20 and 27
    expect(r.reservedBills).toBe(30000);
    expect(r.safeToSpend).toBe(100000 - 10000 - 6000 - 30000);
  });

  it('stops reserving a debt once its minimum is paid this month, and caps at what is still owed', () => {
    const paid = tx({ amount_laari: 10000, debt_id: 'd1' });
    expect(safeToSpend({ ...base, transactions: [paid], debts: [debt()] }).reservedDebts).toBe(0);
    expect(safeToSpend({ ...base, transactions: [tx({ amount_laari: 4000, debt_id: 'd1' })], debts: [debt()] }).reservedDebts).toBe(6000);
    expect(safeToSpend({ ...base, debts: [debt({ balance_laari: 3000 })] }).reservedDebts).toBe(3000); // never reserve more than is owed
    expect(safeToSpend({ ...base, debts: [debt({ balance_laari: 0 })] }).reservedDebts).toBe(0);
  });

  it('counts only the Fridays still to come and not yet given', () => {
    const gaveThisWeek = tx({ kind: 'giving', amount_laari: 2000, commitment_id: 'g1', occurred_on: '2026-11-09' }); // inside the 13th's window
    expect(safeToSpend({ ...base, commitments: [friday()], transactions: [gaveThisWeek] }).reservedGiving).toBe(4000);
    expect(safeToSpend({ ...base, today: '2026-11-28', commitments: [friday()] }).reservedGiving).toBe(0); // no Fridays left
  });

  it('reserves a monthly, one-off or Ramadan gift only when it falls in the rest of this month and is not done', () => {
    expect(safeToSpend({ ...base, commitments: [friday({ schedule: 'monthly', day_of_month: 20, amount_laari: 7000 })] }).reservedGiving).toBe(7000);
    expect(safeToSpend({ ...base, commitments: [friday({ schedule: 'monthly', day_of_month: 20, amount_laari: 7000 })], transactions: [tx({ kind: 'giving', commitment_id: 'g1', occurred_on: '2026-11-02' })] }).reservedGiving).toBe(0);
    expect(safeToSpend({ ...base, commitments: [friday({ schedule: 'once', due_on: '2026-12-05', amount_laari: 9000 })] }).reservedGiving).toBe(0); // next month
    expect(safeToSpend({ ...base, commitments: [friday({ active: false })] }).reservedGiving).toBe(0);
  });

  it('reserves a bill whose date passed unlogged, but not an income item or a bill already logged', () => {
    expect(safeToSpend({ ...base, recurring: [bill({ next_due_on: '2026-11-03', day_of_month: 3 })] }).reservedBills).toBe(30000);
    expect(safeToSpend({ ...base, recurring: [bill({ kind: 'income' })] }).reservedBills).toBe(0);
    expect(safeToSpend({ ...base, recurring: [bill({ next_due_on: '2026-12-25' })] }).reservedBills).toBe(0);
    expect(safeToSpend({ ...base, recurring: [bill({ deleted_at: 'x' })] }).reservedBills).toBe(0);
  });

  it('can be negative, and ignores deleted transactions', () => {
    expect(safeToSpend({ ...base, transactions: [tx({ amount_laari: 5000 })], debts: [debt()] }).safeToSpend).toBe(-15000);
    expect(safeToSpend({ ...base, transactions: [tx({ amount_laari: 5000, deleted_at: 'x' })] }).safeToSpend).toBe(0);
    expect(safeToSpend({ ...base, transactions: [tx({ kind: 'income', amount_laari: 100, occurred_on: '2026-10-31' })] }).income).toBe(0);
  });
});

describe('upcoming items', () => {
  const upcoming = (over: Partial<Parameters<typeof upcomingItems>[0]> = {}) => upcomingItems({ ...base, days: 7, ...over });

  it('lists what falls due within the window, soonest first', () => {
    const items = upcoming({ debts: [debt({ due_day: 12 })], commitments: [friday()], recurring: [bill({ next_due_on: '2026-11-17' })] });
    expect(items.map((i) => [i.kind, i.dueOn])).toEqual([['debt', '2026-11-12'], ['giving', '2026-11-13'], ['bill', '2026-11-17']]);
    expect(items.every((i) => !i.overdue)).toBe(true);
  });
  it('leaves out anything beyond the window or already handled', () => {
    expect(upcoming({ debts: [debt({ due_day: 25 })] })).toEqual([]);
    expect(upcoming({ debts: [debt({ due_day: 12 })], transactions: [tx({ amount_laari: 10000, debt_id: 'd1' })] })).toEqual([]);
    expect(upcoming({ debts: [debt({ due_day: null })] })).toEqual([]);
    expect(upcoming({ commitments: [friday()], transactions: [tx({ kind: 'giving', commitment_id: 'g1', occurred_on: '2026-11-09' })] })).toEqual([]);
  });
  it('shows an unpaid debt minimum whose day has passed as overdue', () => {
    const items = upcoming({ debts: [debt({ due_day: 5 })] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'debt', dueOn: '2026-11-05', overdue: true });
  });
  it('looks ahead to next month once this month is paid', () => {
    const items = upcomingItems({ ...base, today: '2026-11-28', days: 7, debts: [debt({ due_day: 3 })], transactions: [tx({ amount_laari: 10000, debt_id: 'd1', occurred_on: '2026-11-03' })] });
    expect(items.map((i) => i.dueOn)).toEqual(['2026-12-03']);
  });
  it('shows a bill that was never logged as overdue and includes expected income', () => {
    const items = upcoming({ recurring: [bill({ next_due_on: '2026-11-01', day_of_month: 1 }), bill({ id: 'r2', name: 'Salary', kind: 'income', next_due_on: '2026-11-12' })] });
    expect(items.map((i) => [i.kind, i.overdue])).toEqual([['bill', true], ['income', false]]);
  });
});
