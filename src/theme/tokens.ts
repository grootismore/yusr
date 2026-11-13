import { useColorScheme } from 'react-native';

// Design tokens. One source for colour, spacing and type; every screen uses these.
// Look: "Forest Night" in dark (green-black, one lime accent) and a pale-mint light theme. A deep-green panel carries the month's
// figure, pastel lime and lilac tiles hold numbers, a floating pill is the tab bar. Warning amber and over-budget coral keep their own meaning.
export const light = {
  ground: '#F0F3EC', // page background
  groundDeep: '#E0E6DA', // tracks, unselected segments
  surface: '#FFFFFF', // solid surfaces
  card: '#FFFFFF', // card fill
  cardEdge: '#DDE3D6', // card rim
  field: '#FFFFFF', // input and chip fill
  ink: '#0E1511', // text
  inkMuted: '#4F5B53', // secondary text (AA on ground and white)
  line: '#DDE3D6', // hairlines
  control: '#7B857E', // borders of inputs and buttons (3:1 against ground)
  accent: '#14281D', // primary actions, links, selected states (deep forest; labels on it are lime)
  onAccent: '#C6F432',
  accentWash: '#E1EAD8', // tinted tiles behind icons
  hero: '#0E1A14', // the month's figure panel
  onHero: '#FFFFFF',
  lime: '#C6F432', // pastel tile and progress on the panel
  lilac: '#D8D2FF', // second pastel tile
  onTile: '#0E1511', // text on the pastel tiles
  coral: '#B8362E', // over budget, errors
  amber: '#E0A526', // warnings: fill only; the state is always also said in text. Never text or a lone icon
  amberDeep: '#8A5A00', // warning icons and borders (3:1+ on ground and white)
  amberWash: '#FBF0D2', // warning background; ink text on it
  coralWash: '#FCEAE7',
} as const;

export type Palette = { [K in keyof typeof light]: string };

/** The same roles in the dark theme: same hues, lifted for contrast on a dark ground (every text pair is tested). */
export const dark: Palette = {
  ground: '#0B120F',
  groundDeep: '#16221C',
  surface: '#111C16',
  card: '#111C16',
  cardEdge: '#1F3328',
  field: '#111C16',
  ink: '#EAF2EC',
  inkMuted: '#9DB0A4',
  line: '#1F3328',
  control: '#6F8478',
  accent: '#C6F432',
  onAccent: '#0B120F',
  accentWash: '#1B3326',
  hero: '#15291F',
  onHero: '#FFFFFF',
  lime: '#C6F432',
  lilac: '#D8D2FF',
  onTile: '#0E1511',
  coral: '#FF8E80',
  amber: '#E0A526',
  amberDeep: '#F0C45A',
  amberWash: '#3A3015',
  coralWash: '#3A1E1A',
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
