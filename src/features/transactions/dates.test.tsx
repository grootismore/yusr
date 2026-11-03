import { renderHook } from '@testing-library/react-native';
import { i18n, initI18n } from '@/lib/i18n';
import { useHijriRange } from '../giving/format';
import { useFormatDate, useMonthLabel } from './format';

beforeAll(async () => {
  await initI18n();
});
beforeEach(() => {
  i18n.changeLanguage('en');
});

describe('short dates', () => {
  it('writes a date as "1 Nov ’26" and a month as "Nov ’26"', async () => {
    const { result } = await renderHook(() => ({ date: useFormatDate(), month: useMonthLabel() }));
    expect(result.current.date('2026-11-01')).toBe('1 Nov ’26');
    expect(result.current.date('2027-01-15')).toBe('15 Jan ’27');
    expect(result.current.month('2026-11')).toBe('Nov ’26');
  });

  it('keeps the apostrophe before the digits in Dhivehi (right-to-left) by isolating the year', async () => {
    i18n.changeLanguage('dv');
    const { result } = await renderHook(() => ({ date: useFormatDate(), month: useMonthLabel() }));
    expect(result.current.date('2026-11-01')).toContain('\u2066’26\u2069');
    expect(result.current.month('2026-11')).toMatch(/\u2066’26\u2069$/);
  });

  it('has a short month name for every month in both languages', () => {
    for (const language of ['en', 'dv']) {
      for (let m = 1; m <= 12; m++) {
        const key = `monthsShort.m${String(m).padStart(2, '0')}`;
        expect(i18n.getFixedT(language)(key)).not.toBe(key);
      }
    }
  });
});

describe('Hijri range under the month', () => {
  it('names the year once when both months are in it', async () => {
    const { result } = await renderHook(() => useHijriRange());
    expect(result.current('2026-11-01', '2026-11-28')).toBe('Jumada al-Ula – Jumada al-Thani 1448');
  });
});
