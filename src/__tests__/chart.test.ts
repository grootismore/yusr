import { arcs, sliceShares, smoothPath } from '@/features/trends/chart';

describe('chart geometry', () => {
  it('shows the biggest categories and folds the rest into other', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k, i) => [k, (7 - i) * 100] as const);
    const s = sliceShares(rows);
    expect(s).toHaveLength(6);
    expect(s[0]).toMatchObject({ key: 'a', percent: 25 });
    expect(s[5]).toMatchObject({ key: 'other', value: 300 });
    expect(s.reduce((n, x) => n + x.value, 0)).toBe(2800);
  });
  it('drops empty categories and handles nothing at all', () => {
    expect(sliceShares([['a', 0]])).toEqual([]);
    expect(sliceShares([['a', 5], ['b', 0]])).toHaveLength(1);
  });
  it('lays slices around the circle with gaps', () => {
    const a = arcs([1, 1], 100, 4);
    expect(a[0]).toEqual({ start: 0, length: 46 });
    expect(a[1]).toEqual({ start: 50, length: 46 });
    expect(arcs([5], 100)[0]).toEqual({ start: 0, length: 100 }); // one slice is a full ring, no gap
    expect(arcs([0, 0], 100)).toEqual([]);
  });
  it('draws a curve that never dips below the floor', () => {
    const d = smoothPath([{ x: 0, y: 10 }, { x: 10, y: 100 }, { x: 20, y: 10 }], 100);
    expect(d.startsWith('M0,10 C')).toBe(true);
    const ys = [...d.matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(smoothPath([], 0)).toBe('');
  });
});
