import { monthGrid, shiftMonth } from '@/lib/calendar';

describe('calendar', () => {
  it('starts on a Monday and always shows six weeks', () => {
    const g = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(g).toHaveLength(42);
    expect(g[0].iso).toBe('2026-10-26');
    expect(g[6]).toEqual({ iso: '2026-11-01', inMonth: true });
    expect(g.filter((c) => c.inMonth)).toHaveLength(30);
  });
  it('handles a month that starts on Monday and leap years', () => {
    expect(monthGrid(2026, 6)[0]).toEqual({ iso: '2026-06-01', inMonth: true });
    expect(monthGrid(2028, 2).filter((c) => c.inMonth)).toHaveLength(29);
  });
  it('moves across year ends', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
