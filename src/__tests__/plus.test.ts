import { FREE, historyNeedsPlus, householdNeedsPlus, recurringNeedsPlus, scanLimit, splitNeedsPlus } from '@/features/plus/limits';

describe('Plus limits', () => {
  it('scans: 10 free, 100 on Plus', () => {
    expect(scanLimit(false)).toBe(10);
    expect(scanLimit(true)).toBe(100);
  });
  it('recurring: six are free, the seventh needs Plus', () => {
    expect(recurringNeedsPlus(5, false)).toBe(false);
    expect(recurringNeedsPlus(FREE.recurring, false)).toBe(true);
    expect(recurringNeedsPlus(40, true)).toBe(false);
  });
  it('Split: two groups free', () => {
    expect(splitNeedsPlus(1, false)).toBe(false);
    expect(splitNeedsPlus(2, false)).toBe(true);
    expect(splitNeedsPlus(9, true)).toBe(false);
  });
  it('household: two people free, a third needs Plus', () => {
    expect(householdNeedsPlus(1, false)).toBe(false);
    expect(householdNeedsPlus(2, false)).toBe(true);
    expect(householdNeedsPlus(5, true)).toBe(false);
  });
  it('reports history: this month and five before are free', () => {
    expect(historyNeedsPlus('2026-11-01', '2026-11-01', false)).toBe(false);
    expect(historyNeedsPlus('2026-06-01', '2026-11-01', false)).toBe(false);
    expect(historyNeedsPlus('2026-05-01', '2026-11-01', false)).toBe(true);
    expect(historyNeedsPlus('2025-11-01', '2026-11-01', false)).toBe(true);
    expect(historyNeedsPlus('2025-11-01', '2026-11-01', true)).toBe(false);
  });
});
