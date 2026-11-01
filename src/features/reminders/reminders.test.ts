import type { Debt } from '@/features/debts/types';
import type { Commitment } from '@/features/giving/types';
import type { RecurringItem, Transaction } from '@/features/transactions/types';
import { buildReminders, MAX_REMINDERS } from './plan';

const NOW = new Date(2026, 10, 10, 8, 0, 0); // 10 Nov 2026, 08:00 local (a Tuesday)
const stamp = { created_at: '', updated_at: '', deleted_at: null };
const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(), user_id: 'u', account_id: 'a', category_id: 'c', amount_laari: 100, kind: 'expense',
  occurred_on: '2026-11-10', note: null, debt_id: null, commitment_id: null, ...stamp, ...over,
});
const debt = (over: Partial<Debt> = {}): Debt => ({
  id: 'd1', user_id: 'u', lender: 'Secret Lender Pvt Ltd', kind: 'bank', original_laari: 500000, balance_laari: 100000,
  min_payment_laari: 10000, due_day: 20, is_interest_bearing: false, interest_rate_bps: null,
  reference_secret_id: null, notes_secret_id: null, ...stamp, ...over,
});
const gift = (over: Partial<Commitment> = {}): Commitment => ({
  id: 'g1', user_id: 'u', type: 'sadaqah', amount_laari: 2000, schedule: 'weekly_friday', due_on: null, day_of_month: null,
  recipient_note: 'Aminath', reminder_enabled: true, active: true, ...stamp, ...over,
});
const bill = (over: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'r1', user_id: 'u', name: 'Rent', kind: 'expense', amount_laari: 30000, category_id: 'c', account_id: 'a',
  schedule: 'monthly', day_of_month: 25, weekday: null, next_due_on: '2026-11-25', active: true, ...stamp, ...over,
});
const base = { now: NOW, transactions: [] as Transaction[], debts: [] as Debt[], commitments: [] as Commitment[], recurring: [] as RecurringItem[] };
const days = (rs: ReturnType<typeof buildReminders>) => rs.map((r) => [r.kind, r.key.split(':')[2]]);

describe('buildReminders', () => {
  it('fires at 09:00 local on the day, and nothing already in the past', () => {
    const [r] = buildReminders({ ...base, debts: [debt()] });
    expect(r.fireAt).toEqual(new Date(2026, 10, 20, 9, 0, 0));
    // later today at 09:00 is still ahead at 08:00; but not once 09:00 has passed
    expect(buildReminders({ ...base, debts: [debt({ due_day: 10 })] }).map((x) => x.key)).toEqual(['debt:d1:2026-11-10', 'debt:d1:2026-12-10']);
    expect(buildReminders({ ...base, now: new Date(2026, 10, 10, 9, 30), debts: [debt({ due_day: 10 })] }).map((x) => x.key)).toEqual(['debt:d1:2026-12-10']);
  });

  it('reminds for each month a debt minimum is still unpaid, and not for a month already paid', () => {
    expect(days(buildReminders({ ...base, debts: [debt()] }))).toEqual([['debt', '2026-11-20'], ['debt', '2026-12-20']]);
    const paid = tx({ amount_laari: 10000, debt_id: 'd1', occurred_on: '2026-11-04' });
    expect(days(buildReminders({ ...base, debts: [debt()], transactions: [paid] }))).toEqual([['debt', '2026-12-20']]);
  });
  it('skips debts with nothing to remind about', () => {
    for (const d of [debt({ due_day: null }), debt({ min_payment_laari: 0 }), debt({ balance_laari: 0 }), debt({ deleted_at: 'x' })]) {
      expect(buildReminders({ ...base, debts: [d] })).toEqual([]);
    }
  });

  it('reminds for every Friday ahead that has not been given, and respects the reminder switch', () => {
    expect(days(buildReminders({ ...base, commitments: [gift()] })).slice(0, 3)).toEqual([['giving', '2026-11-13'], ['giving', '2026-11-20'], ['giving', '2026-11-27']]);
    const doneThisWeek = tx({ kind: 'giving', commitment_id: 'g1', occurred_on: '2026-11-09' });
    expect(days(buildReminders({ ...base, commitments: [gift()], transactions: [doneThisWeek] }))[0]).toEqual(['giving', '2026-11-20']);
    expect(buildReminders({ ...base, commitments: [gift({ reminder_enabled: false })] })).toEqual([]);
    expect(buildReminders({ ...base, commitments: [gift({ active: false })] })).toEqual([]);
  });
  it('reminds once for a one-off, monthly gifts each month, and the first day of Ramadan', () => {
    expect(days(buildReminders({ ...base, commitments: [gift({ schedule: 'once', due_on: '2026-11-18' })] }))).toEqual([['giving', '2026-11-18']]);
    expect(days(buildReminders({ ...base, commitments: [gift({ schedule: 'monthly', day_of_month: 15 })] }))).toEqual([['giving', '2026-11-15'], ['giving', '2026-12-15']]);
    const ramadan = buildReminders({ ...base, now: new Date(2026, 0, 20, 8), commitments: [gift({ schedule: 'ramadan' })] });
    expect(days(ramadan)).toEqual([['giving', '2026-02-18']]); // 1 Ramadan 1447
    expect(buildReminders({ ...base, now: new Date(2026, 1, 25, 8), commitments: [gift({ schedule: 'ramadan' })] })).toEqual([]); // already under way
  });

  it('reminds for each date a bill falls due in the window', () => {
    expect(days(buildReminders({ ...base, recurring: [bill()] }))).toEqual([['bill', '2026-11-25'], ['bill', '2026-12-25']]);
    expect(buildReminders({ ...base, recurring: [bill({ active: false })] })).toEqual([]);
    expect(days(buildReminders({ ...base, recurring: [bill({ next_due_on: '2026-11-13', schedule: 'weekly', weekday: 5, day_of_month: null })] }))
      .filter(([, d]) => d <= '2026-11-27')).toEqual([['bill', '2026-11-13'], ['bill', '2026-11-20'], ['bill', '2026-11-27']]);
  });

  it('is sorted soonest first and never exceeds the iOS limit', () => {
    const many = buildReminders({ ...base, commitments: [gift(), gift({ id: 'g2' }), gift({ id: 'g3' })], recurring: [bill({ schedule: 'weekly', weekday: 1, day_of_month: null, next_due_on: '2026-11-16' })] });
    expect(many.length).toBeLessThanOrEqual(MAX_REMINDERS);
    const times = many.map((r) => r.fireAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('never puts an amount, lender or recipient into a reminder', () => {
    const json = JSON.stringify(buildReminders({ ...base, debts: [debt()], commitments: [gift()], recurring: [bill()] }));
    for (const secret of ['Secret Lender', 'Aminath', 'Rent', '10000', '30000', '2000']) expect(json).not.toContain(secret);
  });

  it('is deterministic', () => {
    const input = { ...base, debts: [debt()], commitments: [gift()], recurring: [bill()] };
    expect(buildReminders(input)).toEqual(buildReminders(input));
  });
});
