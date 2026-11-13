import { fontFor } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { contrast } from '@/theme/contrast';

// WCAG 2.1 AA: 4.5:1 for text, 3:1 for the borders and icons that identify a control.
const text: [string, keyof typeof colors, keyof typeof colors][] = [
  ['ink on sand', 'ink', 'sand'], ['ink on surface', 'ink', 'surface'], ['muted on sand', 'inkMuted', 'sand'],
  ['muted on surface', 'inkMuted', 'surface'], ['teal on sand', 'teal', 'sand'], ['teal on surface', 'teal', 'surface'],
  ['onTeal on teal', 'onTeal', 'teal'], ['coral on sand', 'coral', 'sand'], ['coral on surface', 'coral', 'surface'],
  ['ink on amberWash', 'ink', 'amberWash'], ['coral on coralWash', 'coral', 'coralWash'], ['ink on tealWash', 'ink', 'tealWash'],
  ['teal on tealWash', 'teal', 'tealWash'], ['ink on sandDeep', 'ink', 'sandDeep'],
];
it.each(text)('text %s has AA contrast', (_n, fg, bg) => expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5));

it.each([['control on sand', 'control', 'sand'], ['control on surface', 'control', 'surface'], ['amberDeep on sand', 'amberDeep', 'sand'], ['amberDeep on surface', 'amberDeep', 'surface']] as const)(
  'UI part %s has 3:1 contrast', (_n, fg, bg) => expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3));

it('Dhivehi text uses Thaana Noor, English and numbers use Nunito Sans', () => {
  expect(fontFor('dv', false)).toBe('ThaanaNoor_Regular');
  expect(fontFor('dv', true)).toBe('ThaanaNoor_Bold');
  expect(fontFor('dv', false, true)).toBe('NunitoSans_400Regular'); // amounts inside Dhivehi text
  expect(fontFor('en', true)).toBe('NunitoSans_700Bold');
});
