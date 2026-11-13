/**
 * Which typeface to use. Dhivehi text uses Thaana Noor. English text, and anything numeric
 * (amounts, dates, rates), uses Nunito Sans: Thaana Noor's own Latin punctuation is malformed
 * (its "." and "," render as tiny raised specks), which is unacceptable inside money amounts.
 */
export type Family = 'ThaanaNoor_Regular' | 'ThaanaNoor_Bold' | 'NunitoSans_400Regular' | 'NunitoSans_700Bold';

export function fontFor(language: string | undefined, bold: boolean, latin = false): Family {
  const thaana = !latin && (language ?? 'dv').startsWith('dv');
  if (thaana) return bold ? 'ThaanaNoor_Bold' : 'ThaanaNoor_Regular';
  return bold ? 'NunitoSans_700Bold' : 'NunitoSans_400Regular';
}
