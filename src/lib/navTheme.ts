import { DarkTheme, DefaultTheme } from 'expo-router';
import { familyFor } from './fonts';
import type { Colors } from './theme';

/**
 * The navigation container's theme from the app's own colours. Without it the navigation bars use
 * the default light theme: in dark mode screen titles and header buttons came out dark-on-dark and
 * disappeared.
 */
export function navigationTheme(scheme: 'light' | 'dark', colors: Colors, language?: string) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Screen titles and header buttons use the same typeface as the rest of the app.
  const font = (weight: 400 | 600 | 700 | 800) => ({ fontFamily: familyFor(language, weight), fontWeight: 'normal' as const });
  const fonts = { regular: font(400), medium: font(600), bold: font(700), heavy: font(800) };
  return {
    ...base,
    dark: scheme === 'dark',
    fonts,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
      notification: colors.danger,
    },
  };
}
