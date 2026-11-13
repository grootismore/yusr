import { palettes, type Palette } from '@/theme/tokens';
import { contrast } from '@/theme/contrast';
import { fontFor } from '@/theme/fonts';

// WCAG 2.1 AA: 4.5:1 for text, 3:1 for the borders and icons that identify a control. Both themes.
const text: [string, keyof Palette, keyof Palette][] = [
  ['ink on ground', 'ink', 'ground'], ['ink on surface', 'ink', 'surface'], ['muted on ground', 'inkMuted', 'ground'],
  ['muted on surface', 'inkMuted', 'surface'], ['accent on ground', 'accent', 'ground'], ['accent on surface', 'accent', 'surface'],
  ['onAccent on accent', 'onAccent', 'accent'], ['coral on ground', 'coral', 'ground'], ['coral on surface', 'coral', 'surface'],
  ['ink on amberWash', 'ink', 'amberWash'], ['coral on coralWash', 'coral', 'coralWash'], ['ink on accentWash', 'ink', 'accentWash'],
  ['accent on accentWash', 'accent', 'accentWash'], ['ink on groundDeep', 'ink', 'groundDeep'], ['muted on groundDeep', 'inkMuted', 'groundDeep'],
  ['ink on coralWash', 'ink', 'coralWash'], ['onHero on hero', 'onHero', 'hero'], ['onTile on lime', 'onTile', 'lime'], ['onTile on lilac', 'onTile', 'lilac'], ['lime on hero', 'lime', 'hero'], ['ink on card', 'ink', 'card'],
];
const parts: [string, keyof Palette, keyof Palette][] = [
  ['control on ground', 'control', 'ground'], ['control on surface', 'control', 'surface'],
  ['amberDeep on ground', 'amberDeep', 'ground'], ['amberDeep on surface', 'amberDeep', 'surface'], ['amberDeep on amberWash', 'amberDeep', 'amberWash'],
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
