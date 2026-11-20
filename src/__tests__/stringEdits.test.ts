import { acceptEdit, applyEdits, revertMissing } from '@/lib/i18n/edits';
import { i18n, initI18n } from '@/lib/i18n';

describe('wording edits', () => {
  beforeAll(async () => { await initI18n(); });

  it('accepts plain text that keeps the same placeholders', () => {
    expect(acceptEdit('Until {{date}}', 'Up to {{date}}')).toBe(true);
    expect(acceptEdit('Until {{date}}', 'Until {{ date }}')).toBe(true);
    expect(acceptEdit('Until {{date}}', 'Until')).toBe(false); // lost the placeholder
    expect(acceptEdit('Until {{date}}', 'Until {{day}}')).toBe(false); // a different one
    expect(acceptEdit('Hello', '')).toBe(false);
    expect(acceptEdit(undefined, 'Hello')).toBe(false); // no such string
    expect(acceptEdit({ a: 'x' }, 'Hello')).toBe(false); // a group, not a string
  });

  it('lays edits over the shipped text and puts it back when an edit is removed', () => {
    const shipped = i18n.getResource('en', 'translation', 'plus.get') as string;
    expect(applyEdits([{ key: 'plus.get', lang: 'en', value: 'Go Plus' }])).toBe(1);
    expect(i18n.t('plus.get', { lng: 'en' })).toBe('Go Plus');
    expect(revertMissing([])).toBe(1);
    expect(i18n.t('plus.get', { lng: 'en' })).toBe(shipped);
  });

  it('ignores an edit that would break a screen', () => {
    const shipped = i18n.getResource('en', 'translation', 'plus.until') as string;
    expect(applyEdits([{ key: 'plus.until', lang: 'en', value: 'Until later' }, { key: 'no.such.key', lang: 'en', value: 'x' }, { key: 'plus.get', lang: 'fr', value: 'x' }])).toBe(0);
    expect(i18n.t('plus.until', { lng: 'en', date: '1 Jan' })).toBe(shipped.replace('{{date}}', '1 Jan'));
  });
});
