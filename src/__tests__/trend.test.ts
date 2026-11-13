import { averageSpend, barPercent, lastMonths, sumByMonth } from '@/features/trends/trend';

it('lists the last months oldest first, across a year end', () => {
  expect(lastMonths('2026-11-01', 3)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
  expect(lastMonths('2026-02-01', 4)).toEqual(['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01']);
});

it('sums per month and ignores rows outside the window', () => {
  const months = lastMonths('2026-11-01', 3);
  expect(sumByMonth([
    { date: '2026-09-30', laari: 100 }, { date: '2026-10-01', laari: 250 }, { date: '2026-10-31', laari: 50 },
    { date: '2026-11-13', laari: 7 }, { date: '2026-08-31', laari: 999 }, { date: '2026-12-01', laari: 999 },
  ], months)).toEqual([100, 300, 7]);
});

it('the average skips months with nothing, and is 0 for no history', () => {
  expect(averageSpend([0, 0, 100, 300])).toBe(200);
  expect(averageSpend([0, 0, 0])).toBe(0);
});

it('bars scale to the tallest, and a small value stays visible', () => {
  expect(barPercent(50, 200)).toBe(25);
  expect(barPercent(1, 1_000_000)).toBe(2);
  expect(barPercent(0, 100)).toBe(0);
  expect(barPercent(5, 0)).toBe(0);
});
