import { LAARI_PER_MVR, MoneyError, add, formatMVR, parseMVR, subtract, sum } from './index';

describe('formatMVR', () => {
  it.each([
    [0, 'MVR 0.00'],
    [1, 'MVR 0.01'],
    [99, 'MVR 0.99'],
    [100, 'MVR 1.00'],
    [125000, 'MVR 1,250.00'],
    [125050, 'MVR 1,250.50'],
    [100000000, 'MVR 1,000,000.00'],
    [-125000, '-MVR 1,250.00'],
    [-1, '-MVR 0.01'],
    [Number.MAX_SAFE_INTEGER, 'MVR 90,071,992,547,409.91'],
    [-Number.MAX_SAFE_INTEGER, '-MVR 90,071,992,547,409.91'],
  ])('formats %d as %s', (laari, expected) => {
    expect(formatMVR(laari)).toBe(expected);
  });

  it('formats negative zero as zero', () => {
    expect(formatMVR(-0)).toBe('MVR 0.00');
  });

  it.each([1.5, NaN, Infinity, 2 ** 53, '100' as unknown as number])('rejects %p', (bad) => {
    expect(() => formatMVR(bad)).toThrow(MoneyError);
  });
});

describe('parseMVR', () => {
  it.each([
    ['0', 0],
    ['1', 100],
    ['1250', 125000],
    ['1,250', 125000],
    ['1,250.5', 125050],
    ['1,250.50', 125050],
    ['0.01', 1],
    ['.5', 50],
    ['MVR 1,250.50', 125050],
    ['mvr1250', 125000],
    ['  12.30  ', 1230],
    ['-12.30', -1230],
    ['-MVR 12.30', -1230],
    ['-0', 0],
    ['١٢٥٠٫٥'.replace('٫', '.'), 125050], // Arabic-Indic digits
    ['۱۲۵۰', 125000], // Extended Arabic-Indic digits
    ['1,000,000.00', 100000000],
  ])('parses %j as %d laari', (input, expected) => {
    expect(parseMVR(input)).toBe(expected);
  });

  it('returns +0 rather than -0', () => {
    expect(Object.is(parseMVR('-0.00'), 0)).toBe(true);
  });

  it.each([
    '', ' ', 'abc', '1.234', '1.', '.', '1,25,0', '1,2500', ',100', '1,,000', '1e3', '--5',
    '12 34', '$5', '5 MVR', '0x10', 'Infinity', '90071992547409.92', '99999999999999999999',
  ])('rejects %j', (input) => {
    expect(() => parseMVR(input)).toThrow(MoneyError);
  });

  it('rejects non-string input', () => {
    expect(() => parseMVR(12.5 as unknown as string)).toThrow(MoneyError);
  });

  it('round-trips with formatMVR', () => {
    for (const laari of [0, 1, 99, 100, 101, 123456789, -5050]) {
      expect(parseMVR(formatMVR(laari))).toBe(laari);
    }
  });
});

describe('arithmetic', () => {
  it('adds, subtracts and sums integers exactly', () => {
    expect(add(10, 20)).toBe(30);
    expect(subtract(10, 25)).toBe(-15);
    // 0.1 + 0.2 style trap: 10 laari + 20 laari is exactly 30
    expect(add(10, 20)).toBe(30);
    expect(sum([])).toBe(0);
    expect(sum([125000, 125050, -50])).toBe(250000);
  });

  it('never returns negative zero', () => {
    expect(Object.is(subtract(5, 5), 0)).toBe(true);
    expect(Object.is(add(-0, 0), 0)).toBe(true);
  });

  it('throws on floats and non-numbers', () => {
    expect(() => add(0.5, 1)).toThrow(MoneyError);
    expect(() => subtract(1, NaN)).toThrow(MoneyError);
    expect(() => sum([1, 2.5])).toThrow(MoneyError);
  });

  it('throws when the result leaves the safe integer range', () => {
    expect(() => add(Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyError);
    expect(() => subtract(-Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyError);
  });

  it('uses 100 laari per MVR', () => {
    expect(LAARI_PER_MVR).toBe(100);
  });
});
