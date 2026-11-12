import dv from './locales/dv.json';
import en from './locales/en.json';
import { isRtl, resolveLanguage } from './index';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));
jest.mock('expo-localization', () => ({ getLocales: () => [] }));

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function values(obj: Record<string, unknown>): string[] {
  return Object.values(obj).flatMap((value) =>
    typeof value === 'object' && value !== null ? values(value as Record<string, unknown>) : [String(value)],
  );
}

describe('locale files', () => {
  it('en and dv define exactly the same keys', () => {
    expect(keys(dv).sort()).toEqual(keys(en).sort());
  });

  it('has no empty strings', () => {
    for (const text of [...values(en), ...values(dv)]) expect(text.trim()).not.toBe('');
  });

  it('dv strings contain Thaana script (guards against copy-pasted English)', () => {
    const thaana = /[ހ-޿]/;
    for (const text of values(dv)) expect(text).toMatch(thaana);
  });
});

describe('resolveLanguage', () => {
  it('prefers a stored choice', () => {
    expect(resolveLanguage('dv', ['en'])).toBe('dv');
    expect(resolveLanguage('en', ['dv'])).toBe('en');
  });
  it('ignores an invalid stored value', () => {
    expect(resolveLanguage('fr', ['dv'])).toBe('dv');
  });
  it('uses Dhivehi only when it is the first device language', () => {
    expect(resolveLanguage(null, ['dv', 'en'])).toBe('dv');
    expect(resolveLanguage(null, ['en', 'dv'])).toBe('en');
    expect(resolveLanguage(null, [])).toBe('en');
    expect(resolveLanguage(null, [null])).toBe('en');
  });
});

describe('isRtl', () => {
  it('is true only for Dhivehi', () => {
    expect(isRtl('dv')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
});
