import { DarkTheme, DefaultTheme } from 'expo-router';
import { usesNunito } from './fonts';
import type { Colors } from './theme';

/**
 * The navigation container's theme from the app's own colours. Without it the navigation bars use
 * the default light theme: in dark mode screen titles and header buttons came out dark-on-dark and
 * disappeared.
 */
export function navigationTheme(scheme: 'light' | 'dark', colors: Colors, language?: string) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Screen titles and header buttons use the same typeface as the rest of the app.
  const fonts = usesNunito(language)
    ? {
        regular: { fontFamily: 'NunitoSans_400Regular', fontWeight: 'normal' as const },
        medium: { fontFamily: 'NunitoSans_600SemiBold', fontWeight: 'normal' as const },
        bold: { fontFamily: 'NunitoSans_700Bold', fontWeight: 'normal' as const },
        heavy: { fontFamily: 'NunitoSans_800ExtraBold', fontWeight: 'normal' as const },
      }
    : base.fonts;
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
