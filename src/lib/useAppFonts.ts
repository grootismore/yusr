import { useFonts } from 'expo-font';
import type { FontFamily } from './fonts';

// Only the weights the app uses are bundled: four of Nunito Sans (English) and two of MV Faseyha (Dhivehi).
export const FONT_FILES: Record<FontFamily, number> = {
  NunitoSans_400Regular: require('@expo-google-fonts/nunito-sans/400Regular/NunitoSans_400Regular.ttf'),
  NunitoSans_600SemiBold: require('@expo-google-fonts/nunito-sans/600SemiBold/NunitoSans_600SemiBold.ttf'),
  NunitoSans_700Bold: require('@expo-google-fonts/nunito-sans/700Bold/NunitoSans_700Bold.ttf'),
  NunitoSans_800ExtraBold: require('@expo-google-fonts/nunito-sans/800ExtraBold/NunitoSans_800ExtraBold.ttf'),
  MVFaseyha_Regular: require('../../assets/fonts/MV_Faseyha_Regular.ttf'),
  MVFaseyha_Bold: require('../../assets/fonts/MV_Faseyha_Bold.ttf'),
};

/** True once the fonts have loaded, or failed to: the app must never wait forever on a font. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || error !== null;
}
