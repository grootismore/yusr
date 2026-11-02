import { useFonts } from 'expo-font';
import type { FontFamily } from './fonts';

// The font files live in the repo (`assets/fonts`) and ship inside the app: nothing is downloaded.
// Only the weights the app uses are bundled: four of Nunito Sans (English) and two of MV Faseyha (Dhivehi).
export const FONT_FILES: Record<FontFamily, number> = {
  NunitoSans_400Regular: require('../../assets/fonts/NunitoSans_400Regular.ttf'),
  NunitoSans_600SemiBold: require('../../assets/fonts/NunitoSans_600SemiBold.ttf'),
  NunitoSans_700Bold: require('../../assets/fonts/NunitoSans_700Bold.ttf'),
  NunitoSans_800ExtraBold: require('../../assets/fonts/NunitoSans_800ExtraBold.ttf'),
  MVFaseyha_Regular: require('../../assets/fonts/MV_Faseyha_Regular.ttf'),
  MVFaseyha_Bold: require('../../assets/fonts/MV_Faseyha_Bold.ttf'),
};

/** True once the fonts have loaded, or failed to: the app must never wait forever on a font. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || error !== null;
}
