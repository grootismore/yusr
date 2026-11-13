// Design tokens. One source for colour, spacing and type; every screen uses these.
export const colors = {
  sand: '#F5F1E8', // background
  surface: '#FFFFFF',
  sandDeep: '#E9E3D4', // tracks, unselected chips
  ink: '#15211F', // text
  inkMuted: '#4A5754', // secondary text (AA on sand and white)
  line: '#D8D1BF', // hairlines and decorative borders
  control: '#7B7664', // borders of inputs and buttons (3:1 against sand)
  teal: '#0B6B68', // accent, primary actions
  onTeal: '#FFFFFF',
  coral: '#B8432A', // over budget, errors
  amber: '#E0A526', // warnings: fill only; the state is always also said in text. Never text or a lone icon
  amberDeep: '#8A5A00', // warning icons and borders (3:1+ on sand and white)
  amberWash: '#FBF0D2', // warning background; ink text on it
  coralWash: '#FCEFEA',
  tealWash: '#DCEBE8',
} as const;

/** 4-pt grid. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

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
