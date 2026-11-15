/**
 * Which typeface to use. Dhivehi text uses Thaana Noor. English text, and anything numeric (amounts, dates, rates), uses
 * the phone's own system font, in its rounded design on iPhone (SF Pro Rounded: soft, sleek and crisp, the same family
 * Apple uses for friendly money and health apps) and the standard system font elsewhere. It follows the person's text
 * size and weight settings and has proper punctuation inside money amounts, which Thaana Noor's own Latin glyphs do
 * not (its "." and "," render as tiny raised specks).
 */
import { Platform } from 'react-native';

const LATIN_FAMILY = Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, system-ui, sans-serif', default: undefined });

export type Weight = 'regular' | 'semibold' | 'bold';
export interface Face { fontFamily?: string; fontWeight?: '400' | '600' | '700' }

export function faceFor(language: string | undefined, weight: Weight, latin = false): Face {
  const thaana = !latin && (language ?? 'dv').startsWith('dv');
  if (thaana) return { fontFamily: weight === 'regular' ? 'ThaanaNoor_Regular' : 'ThaanaNoor_Bold' }; // Thaana Noor has two weights
  return { ...(LATIN_FAMILY ? { fontFamily: LATIN_FAMILY } : {}), fontWeight: weight === 'regular' ? '400' : weight === 'semibold' ? '600' : '700' };
}
