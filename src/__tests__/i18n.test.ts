import dv from '@/lib/i18n/locales/dv.json';
import en from '@/lib/i18n/locales/en.json';
import { DEFAULT_LANGUAGE, isRtl, resolveLanguage } from '@/lib/i18n';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
const strings = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === 'object' ? strings(v) : [String(v)]));

it('Dhivehi is the default and the only RTL language', () => {
  expect(DEFAULT_LANGUAGE).toBe('dv');
  expect(resolveLanguage(null)).toBe('dv');
  expect(resolveLanguage('fr')).toBe('dv');
  expect(resolveLanguage('en')).toBe('en');
  expect(isRtl('dv')).toBe(true);
  expect(isRtl('en')).toBe(false);
});
it('dv and en have exactly the same keys', () => expect(keys(dv)).toEqual(keys(en)));
it('every string is filled and uses the same {{placeholders}} in both languages', () => {
  const k = keys(en).filter((x) => x !== '_draft');
  const get = (o: any, path: string) => path.split('.').reduce((a, p) => a[p], o) as string;
  for (const key of k) {
    expect(get(dv, key).trim()).not.toBe('');
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    expect(ph(get(dv, key))).toEqual(ph(get(en, key)));
  }
});
it('Dhivehi strings are marked as a draft and actually contain Thaana', () => {
  expect(dv._draft).toMatch(/DRAFT/);
  expect(strings(dv).filter((s) => /[ހ-޿]/.test(s)).length).toBeGreaterThan(100);
});
