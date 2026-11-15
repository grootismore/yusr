import { dueRuns, nextDate, nthDate, occurrences, type RecurringItem, type RecurringRun } from '@/features/recurring/logic';

const item = (o: Partial<RecurringItem> & { id: string }): RecurringItem => ({ kind: 'expense', name: o.id, note: null, amount_minor: 100_000, currency: 'MVR', category_id: null, every: 'month', starts_on: '2026-09-05', ended_on: null, auto_add: true, ...o });

describe('recurring dates', () => {
  it('monthly keeps the day of the month, and uses the last day in a short month', () => {
    expect([0, 1, 2, 3].map((k) => nthDate('2026-01-31', 'month', k))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
  it('weekly keeps the weekday and yearly keeps the day of the year, including 29 February', () => {
    expect([0, 1, 2].map((k) => nthDate('2026-11-05', 'week', k))).toEqual(['2026-11-05', '2026-11-12', '2026-11-19']);
    expect([0, 1, 2, 3, 4].map((k) => nthDate('2024-02-29', 'year', k))).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });
  it('lists the dates up to today and stops at the end date', () => {
    expect(occurrences(item({ id: 'a' }), '2026-11-20')).toEqual(['2026-09-05', '2026-10-05', '2026-11-05']);
    expect(occurrences(item({ id: 'a', ended_on: '2026-10-10' }), '2026-11-20')).toEqual(['2026-09-05', '2026-10-05']);
  });
  it('what is due is every date up to today that was not recorded, skipped or deleted', () => {
    const runs: RecurringRun[] = [
      { id: 'r1', recurring_id: 'a', occurrence: '2026-09-05', expense_id: 'e1', income_id: null, skipped: false },
      { id: 'r2', recurring_id: 'a', occurrence: '2026-10-05', expense_id: null, income_id: null, skipped: true },
    ];
    expect(dueRuns([item({ id: 'a' })], runs, '2026-11-20').map((d) => d.occurrence)).toEqual(['2026-11-05']);
    // recorded then deleted (expense_id null, not skipped) still counts as dealt with
    expect(dueRuns([item({ id: 'a' })], [{ id: 'r3', recurring_id: 'a', occurrence: '2026-11-05', expense_id: null, income_id: null, skipped: false }, ...runs], '2026-11-20')).toEqual([]);
  });
  it('a long-forgotten manual item lists only its last twelve dates', () => {
    expect(dueRuns([item({ id: 'a', starts_on: '2024-01-05' })], [], '2026-11-20')).toHaveLength(12);
  });
  it('the next date is the first one after today', () => {
    expect(nextDate(item({ id: 'a' }), '2026-11-20')).toBe('2026-12-05');
    expect(nextDate(item({ id: 'a', ended_on: '2026-11-30' }), '2026-11-20')).toBeNull();
  });
});
