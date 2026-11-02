import { useColorScheme } from 'react-native';

// Semantic colours, light and dark. Placeholder palette (muted green + warm neutral);
// contrast must be re-checked against WCAG AA when the design system is frozen.
const light = {
  background: '#EAF2EF', // sea-glass ground, tinted toward the logo green
  surface: '#FFFFFF',
  surfaceMuted: '#DCEAE4', // tracks of controls, unselected chips
  text: '#0F2A23',
  secondaryText: '#4B6A60',
  separator: '#D2E1DA',
  // The logo's deep green. 9.69:1 on white, 8.51:1 on the background (WCAG AA needs 4.5:1 for text).
  tint: '#0D4E3A',
  positive: '#13705F', // income, money that came in
  gold: '#8A5A0E', // the logo's flame, dark enough to read as text (5.92:1 on white)
  // Overdue and destructive. A coral red from the lagoon palette, 5.62:1 on white.
  danger: '#B4412F',
} as const;

const dark = {
  background: '#071A14',
  surface: '#0E2A22',
  surfaceMuted: '#16372E',
  text: '#E6F2EC',
  secondaryText: '#9DBBB0',
  separator: '#1F3F35',
  tint: '#6FCBA6',
  positive: '#6FCBA6',
  gold: '#E0B260',
  danger: '#FF8F7F',
} as const;

export type Colors = { [K in keyof typeof light]: string };

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
