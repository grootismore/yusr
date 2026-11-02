import { DarkTheme, DefaultTheme } from 'expo-router';
import type { Colors } from './theme';

/**
 * The navigation container's theme from the app's own colours. Without it the navigation bars use
 * the default light theme: in dark mode screen titles and header buttons came out dark-on-dark and
 * disappeared.
 */
export function navigationTheme(scheme: 'light' | 'dark', colors: Colors) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: scheme === 'dark',
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
