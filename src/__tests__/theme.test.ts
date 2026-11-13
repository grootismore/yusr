import { palettes, type Palette } from '@/theme/tokens';
import { contrast } from '@/theme/contrast';
import { fontFor } from '@/theme/fonts';

// WCAG 2.1 AA: 4.5:1 for text, 3:1 for the borders and icons that identify a control. Both themes.
const text: [string, keyof Palette, keyof Palette][] = [
  ['ink on sand', 'ink', 'sand'], ['ink on surface', 'ink', 'surface'], ['muted on sand', 'inkMuted', 'sand'],
  ['muted on surface', 'inkMuted', 'surface'], ['teal on sand', 'teal', 'sand'], ['teal on surface', 'teal', 'surface'],
  ['onTeal on teal', 'onTeal', 'teal'], ['coral on sand', 'coral', 'sand'], ['coral on surface', 'coral', 'surface'],
  ['ink on amberWash', 'ink', 'amberWash'], ['coral on coralWash', 'coral', 'coralWash'], ['ink on tealWash', 'ink', 'tealWash'],
  ['teal on tealWash', 'teal', 'tealWash'], ['ink on sandDeep', 'ink', 'sandDeep'], ['muted on sandDeep', 'inkMuted', 'sandDeep'],
  ['ink on coralWash', 'ink', 'coralWash'],
];
const parts: [string, keyof Palette, keyof Palette][] = [
  ['control on sand', 'control', 'sand'], ['control on surface', 'control', 'surface'],
  ['amberDeep on sand', 'amberDeep', 'sand'], ['amberDeep on surface', 'amberDeep', 'surface'], ['amberDeep on amberWash', 'amberDeep', 'amberWash'],
];

describe.each(['light', 'dark'] as const)('%s theme', (name) => {
  const c = palettes[name];
  it.each(text)('text %s has AA contrast', (_n, fg, bg) => expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5));
  it.each(parts)('UI part %s has 3:1 contrast', (_n, fg, bg) => expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(3));
});

it('both themes define every role', () => expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort()));

it('Dhivehi text uses Thaana Noor, English and numbers use Nunito Sans', () => {
  expect(fontFor('dv', false)).toBe('ThaanaNoor_Regular');
  expect(fontFor('dv', true)).toBe('ThaanaNoor_Bold');
  expect(fontFor('dv', false, true)).toBe('NunitoSans_400Regular'); // amounts inside Dhivehi text
  expect(fontFor('en', true)).toBe('NunitoSans_700Bold');
});
