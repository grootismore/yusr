import { formatCompactMoney, formatMoney, formatMVR, ltr, money, parseAmount, parseRate, toMvrLaari, MoneyError, sum } from '@/lib/money';

describe('parseAmount', () => {
  it.each([
    ['1250', 125000], ['1,250.5', 125050], ['MVR 1,250.50', 125050], ['-12.30', -1230], ['.5', 50], ['0.29', 29],
    ['١٢٫٥'.replace('٫', '.'), 1250], ['USD 10', 1000],
  ])('parses %s', (input, laari) => expect(parseAmount(input)).toBe(laari));

  it.each(['', 'abc', '1.234', '12,34', '1,2345', '1..2', '--1', '9'.repeat(20)])('rejects %s', (input) =>
    expect(() => parseAmount(input)).toThrow(MoneyError));

  it('never loses a laari to float error', () => expect(parseAmount('0.1') + parseAmount('0.2')).toBe(30));
});

describe('format', () => {
  it('formats with Latin digits and grouping', () => {
    expect(formatMVR(123450)).toBe('MVR 1,234.50');
    expect(formatMVR(5)).toBe('MVR 0.05');
    expect(formatMVR(-123450)).toBe('-MVR 1,234.50');
    expect(formatMoney(1000, 'USD')).toBe('USD 10');
    expect(formatMoney(1050, 'USD')).toBe('USD 10.50');
  });
  it('round-trips', () => {
    for (const n of [0, 1, 99, 100, 123456789, -250]) expect(parseAmount(formatMVR(n).replace('MVR ', ''))).toBe(n);
  });
  it('wraps amounts as an isolated LTR run', () => {
    expect(money(123450)).toBe('⁦MVR 1,234.50⁩');
    expect(ltr('x')).toBe('⁦x⁩');
  });
});

describe('currency conversion', () => {
  it('converts minor units exactly and rounds half up', () => {
    expect(toMvrLaari(10000, '15.42')).toBe(154200);
    expect(toMvrLaari(1, '15.42')).toBe(15); // 15.42 laari
    expect(toMvrLaari(1, '15.5')).toBe(16);
    expect(toMvrLaari(333, '0.12345678')).toBe(41); // 41.11
  });
  it('rejects bad rates', () => {
    for (const r of ['', '0', 'abc', '-1', '1.123456789']) expect(() => parseRate(r)).toThrow(MoneyError);
  });
  it('sums safely', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(() => sum([Number.MAX_SAFE_INTEGER, 1])).toThrow(MoneyError);
  });
});

describe('compact money for a small box', () => {
  it('leaves amounts under a million alone', () => {
    expect(formatCompactMoney(123_456_78)).toBe('MVR 123,456.78');
    expect(formatCompactMoney(99_999_999)).toBe('MVR 999,999.99');
  });
  it('shortens millions and billions to at most two decimals', () => {
    expect(formatCompactMoney(123_475_689_00)).toBe('MVR 123.48M');
    expect(formatCompactMoney(1_000_000_00)).toBe('MVR 1M');
    expect(formatCompactMoney(2_500_000_000_00)).toBe('MVR 2.5B');
    expect(formatCompactMoney(-12_340_000_00)).toBe('-MVR 12.34M');
  });
});
