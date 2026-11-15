/**
 * Which typeface to use. Dhivehi text uses Thaana Noor. English text, and anything numeric (amounts, dates, rates), uses
 * the phone's own system font (San Francisco on iOS, Roboto on Android): it is what every native app looks like, it
 * follows the person's text size and weight settings, and it has proper punctuation inside money amounts, which
 * Thaana Noor's own Latin glyphs do not (its "." and "," render as tiny raised specks).
 */
export type Weight = 'regular' | 'semibold' | 'bold';
export interface Face { fontFamily?: string; fontWeight?: '400' | '600' | '700' }

export function faceFor(language: string | undefined, weight: Weight, latin = false): Face {
  const thaana = !latin && (language ?? 'dv').startsWith('dv');
  if (thaana) return { fontFamily: weight === 'regular' ? 'ThaanaNoor_Regular' : 'ThaanaNoor_Bold' }; // Thaana Noor has two weights
  return { fontWeight: weight === 'regular' ? '400' : weight === 'semibold' ? '600' : '700' };
}
