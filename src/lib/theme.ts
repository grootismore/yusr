import { useColorScheme } from 'react-native';

// Semantic colours, light and dark. Placeholder palette (muted green + warm neutral);
// contrast must be re-checked against WCAG AA when the design system is frozen.
const light = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  secondaryText: '#6C6C70',
  separator: '#C6C6C8',
  // Matches the app icon. 6.45:1 on white, 5.78:1 on the background (WCAG AA for text).
  tint: '#1F6B49',
  // Apple's accessible system red (increased-contrast variant), so red text passes 4.5:1.
  danger: '#D70015',
} as const;

const dark = {
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  secondaryText: '#AEAEB2',
  separator: '#38383A',
  tint: '#5CC49A',
  danger: '#FF6961',
} as const;

export type Colors = { [K in keyof typeof light]: string };

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
