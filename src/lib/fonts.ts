/**
 * Typefaces. English uses Nunito Sans; Dhivehi uses MV Faseyha (a Thaana typeface that also has
 * Latin letters and digits). React Native picks a custom font by family name, one name per weight,
 * so the weights the app uses are listed here; the files load in `useAppFonts`.
 */
export type FontFamily =
  | 'NunitoSans_400Regular'
  | 'NunitoSans_600SemiBold'
  | 'NunitoSans_700Bold'
  | 'NunitoSans_800ExtraBold'
  | 'MVFaseyha_Regular'
  | 'MVFaseyha_Bold';

/** The Nunito Sans family for a CSS-style font weight ("bold", "600", 700 ...). */
export function familyForWeight(weight: string | number | undefined): FontFamily {
  const n = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  if (!Number.isFinite(n) || n <= 400) return 'NunitoSans_400Regular';
  if (n < 700) return 'NunitoSans_600SemiBold';
  if (n < 800) return 'NunitoSans_700Bold';
  return 'NunitoSans_800ExtraBold';
}

/** MV Faseyha comes in two weights: anything semibold and up uses Bold. */
export function thaanaFamilyForWeight(weight: string | number | undefined): FontFamily {
  const n = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  return Number.isFinite(n) && n >= 600 ? 'MVFaseyha_Bold' : 'MVFaseyha_Regular';
}

export const isDhivehi = (language: string | undefined): boolean => (language ?? 'en').toLowerCase().startsWith('dv');

/** The app's typeface for a language and weight. */
export const familyFor = (language: string | undefined, weight: string | number | undefined): FontFamily =>
  isDhivehi(language) ? thaanaFamilyForWeight(weight) : familyForWeight(weight);
