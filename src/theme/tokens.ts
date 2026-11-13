import { useColorScheme } from 'react-native';

// Design tokens. One source for colour, spacing and type; every screen uses these.
// Look: soft "Forest Night" in dark (green-black, one pastel-mint accent) and a pale-sage light theme. A muted pine panel carries the
// month's figure, pastel mint and lilac tiles hold numbers, a floating pill is the tab bar. Warning amber and over-budget coral keep their own meaning.
export const light = {
  ground: '#F2F6F1', // page background
  groundDeep: '#E2EBE0', // tracks, unselected segments
  surface: '#FFFFFF', // solid surfaces
  card: '#FFFFFF', // card fill
  cardEdge: '#DEE7DC', // card rim
  field: '#FFFFFF', // input and chip fill
  ink: '#14201A', // text
  inkMuted: '#52605A', // secondary text (AA on ground and white)
  line: '#DEE7DC', // hairlines
  control: '#7F8B84', // borders of inputs and buttons (3:1 against ground)
  accent: '#2E5B47', // primary actions, links, selected states (muted pine)
  onAccent: '#FFFFFF',
  accentWash: '#DCEBDD', // tinted tiles behind icons
  hero: '#264A3B', // the month's figure panel
  onHero: '#FFFFFF',
  mint: '#BEE3CB', // pastel tile, progress on the panel, active tab
  lilac: '#DAD5F6', // second pastel tile
  onTile: '#14201A', // text on the pastel tiles
  coral: '#B8362E', // over budget, errors
  amber: '#E0A526', // warnings: fill only; the state is always also said in text. Never text or a lone icon
  amberDeep: '#8A5A00', // warning icons and borders (3:1+ on ground and white)
  amberWash: '#FBF0D2', // warning background; ink text on it
  coralWash: '#FCEAE7',
} as const;

export type Palette = { [K in keyof typeof light]: string };

/** The same roles in the dark theme: same hues, lifted for contrast on a dark ground (every text pair is tested). */
export const dark: Palette = {
  ground: '#0F1714',
  groundDeep: '#18241F',
  surface: '#15201B',
  card: '#15201B',
  cardEdge: '#243630',
  field: '#15201B',
  ink: '#E9F0EB',
  inkMuted: '#A0B1A8',
  line: '#243630',
  control: '#74887D',
  accent: '#A9D9BA',
  onAccent: '#0F1A15',
  accentWash: '#213B30',
  hero: '#1F3D31',
  onHero: '#FFFFFF',
  mint: '#A9D9BA',
  lilac: '#CFC9F2',
  onTile: '#14201A',
  coral: '#FF9A8C',
  amber: '#E0A526',
  amberDeep: '#F0C45A',
  amberWash: '#3A3015',
  coralWash: '#3A211D',
};

export const palettes = { light, dark } as const;

/** The colours for the current appearance (system, or the person's choice in Settings). Every screen reads colours here. */
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** True when the dark theme is showing. */
export const useIsDark = (): boolean => useColorScheme() === 'dark';

/** 4-pt grid. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

/** Minimum touch target in points (WCAG 2.5.8 and platform guidance). */
export const TOUCH = 44;

/** Type scale. Thaana needs more line height than Latin for its stacked vowel signs. */
export const type = {
  display: { size: 32, weight: 'bold' },
  title: { size: 24, weight: 'bold' },
  heading: { size: 19, weight: 'bold' },
  body: { size: 17, weight: 'regular' },
  small: { size: 15, weight: 'regular' },
  label: { size: 15, weight: 'bold' },
} as const;
export type TypeVariant = keyof typeof type;
export const LINE_HEIGHT = { dv: 1.75, en: 1.4 } as const;
