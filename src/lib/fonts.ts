/**
 * Nunito Sans is the default typeface for English. React Native picks a custom font by family name,
 * one name per weight, so the weights the app uses are listed here (the files load in `useAppFonts`).
 * Nunito Sans has no Thaana glyphs: Dhivehi keeps the system font (see `usesNunito`).
 */
export type FontFamily = 'NunitoSans_400Regular' | 'NunitoSans_600SemiBold' | 'NunitoSans_700Bold' | 'NunitoSans_800ExtraBold';

/** The family for a CSS-style font weight ("bold", "600", 700 ...). */
export function familyForWeight(weight: string | number | undefined): FontFamily {
  const n = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  if (!Number.isFinite(n) || n <= 400) return 'NunitoSans_400Regular';
  if (n < 700) return 'NunitoSans_600SemiBold';
  if (n < 800) return 'NunitoSans_700Bold';
  return 'NunitoSans_800ExtraBold';
}

/** English (and any other Latin-script language) uses Nunito Sans; Dhivehi falls back to the system font. */
export const usesNunito = (language: string | undefined): boolean => !(language ?? 'en').toLowerCase().startsWith('dv');
