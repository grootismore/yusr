import { useColorScheme } from 'react-native';

// Design tokens. One source for colour, spacing and type; every screen uses these.
// Look: "Ink and sky". A light page, a matte-black figure panel, one soft sky-blue accent for progress and the active tab.
// Text and icons are matte black; dark mode lifts the same roles. Warning amber and over-budget coral keep their own meaning.
export const light = {
  ground: '#CBD2D9', // page background: dusty blue-grey
  groundDeep: '#B9C1C9', // tracks, unselected segments
  surface: '#E4E9EE', // solid surfaces: one step lighter than the page, never pure white
  card: '#E4E9EE', // card fill: lighter than the page (#CBD2D9) so cards read as cards, not as the page itself
  cardEdge: '#B7BFC8', // card rim
  field: '#D9DFE5', // input and chip fill
  ink: '#1E2023', // text and icons: matte black
  inkMuted: '#4A4E54', // secondary text (AA on ground and card)
  line: '#B7BFC8', // hairlines
  control: '#69717A', // borders of inputs and buttons (3:1 against ground)
  accent: '#1E2023', // primary actions, selected states
  onAccent: '#FFFFFF',
  accentWash: '#C0C8D0', // tinted tiles behind icons
  hero: '#222428', // the month's figure panel: matte black
  onHero: '#FFFFFF',
  sky: '#8EC5F0', // the one soft accent: progress on the panel, the Left tile, the active tab
  tile: '#D9DFE5', // neutral figure tile
  onTile: '#1E2023', // text on the tiles
  coral: '#A52D26', // over budget, errors
  amber: '#E0A526', // warnings: fill only; the state is always also said in text. Never text or a lone icon
  amberDeep: '#8A5A00', // warning icons and borders (3:1+ on ground and white)
  amberWash: '#F1E5C6', // warning background; ink text on it
  coralWash: '#F1DDD9',
} as const;

/** Colours for charts, in the order they are used. Every chart also names what each colour is, so colour is never the only cue. */
export const series = {
  light: ['#2F5D8C', '#3E8E7E', '#C98A12', '#A8557A', '#6F63A8', '#5B8DB8', '#7C848C'],
  dark: ['#8EC5F0', '#6CC4B0', '#E0A526', '#D68AAE', '#A99BE0', '#5F9FD6', '#9AA0A8'],
} as const;

export type Palette = { [K in keyof typeof light]: string };

/** The same roles in the dark theme: same hues, lifted for contrast on a dark ground (every text pair is tested). */
export const dark: Palette = {
  ground: '#141517',
  groundDeep: '#212327',
  surface: '#1D1F22',
  card: '#1D1F22',
  cardEdge: '#2C2F34',
  field: '#1D1F22',
  ink: '#F1F1EF',
  inkMuted: '#A3A6AB',
  line: '#2C2F34',
  control: '#7A7D83',
  accent: '#8EC5F0',
  onAccent: '#1E2023',
  accentWash: '#2A2C30',
  hero: '#27292D',
  onHero: '#FFFFFF',
  sky: '#8EC5F0',
  tile: '#C0C8CF',
  onTile: '#1E2023',
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
export interface TypeRole { size: number; dvSize?: number; weight: 'regular' | 'semibold' | 'bold'; lh: number; track: number }
/**
 * One role per job. Large titles open a tab screen, titles open a pushed screen, display is a figure, heading is a
 * section, body and small are reading text, label is a control or a field name. Headlines sit tighter than reading text
 * and get a touch of negative tracking (Latin only: tracking breaks Thaana's joined letters). dvSize is the Dhivehi
 * size where Thaana, being tall, wants less.
 */
export const type: Record<'largeTitle' | 'display' | 'title' | 'heading' | 'body' | 'small' | 'label', TypeRole> = {
  largeTitle: { size: 34, dvSize: 30, weight: 'bold', lh: 1.18, track: -0.4 },
  display: { size: 36, dvSize: 32, weight: 'bold', lh: 1.15, track: -0.5 },
  title: { size: 28, dvSize: 25, weight: 'bold', lh: 1.2, track: -0.3 },
  heading: { size: 20, dvSize: 19, weight: 'semibold', lh: 1.3, track: -0.2 },
  body: { size: 17, weight: 'regular', lh: 1.45, track: 0 },
  small: { size: 15, weight: 'regular', lh: 1.4, track: 0 },
  label: { size: 15, weight: 'semibold', lh: 1.35, track: 0 },
};
export type TypeVariant = keyof typeof type;
/** Thaana's stacked vowel signs need more room than Latin, in every role. */
export const DV_LINE_HEIGHT = 1.75;
