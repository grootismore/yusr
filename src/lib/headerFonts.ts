import { familyFor } from './fonts';

/**
 * Titles in the navigation bar are drawn by the system, which ignores the navigation theme's fonts
 * and falls back to San Francisco (or the system Thaana face). Passing the app's typeface to each
 * stack's `screenOptions` makes the large title, the small title and the back label match the rest
 * of the app: Nunito Sans for English, MV Faseyha for Dhivehi.
 */
export const headerFontOptions = (language: string | undefined) => ({
  headerTitleStyle: { fontFamily: familyFor(language, 700) },
  headerLargeTitleStyle: { fontFamily: familyFor(language, 800) },
  headerBackTitleStyle: { fontFamily: familyFor(language, 400) },
});
