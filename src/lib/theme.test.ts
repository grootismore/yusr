import { BRAND, palettes } from './theme';

// WCAG 2.x relative luminance and contrast ratio.
const channel = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(['light', 'dark'] as const)('%s theme contrast (WCAG AA: 4.5:1 for text)', (mode) => {
  const c = palettes[mode];
  const grounds = { background: c.background, surface: c.surface, 'muted surface': c.surfaceMuted };
  const texts = { text: c.text, 'secondary text': c.secondaryText, tint: c.tint, positive: c.positive, gold: c.gold, danger: c.danger };

  for (const [groundName, ground] of Object.entries(grounds)) {
    for (const [textName, text] of Object.entries(texts)) {
      it(`${textName} on ${groundName}`, () => {
        expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('the separator stays visible against the surface (3:1 is for meaningful boundaries; this one is decorative, so only check it differs)', () => {
    expect(contrast(c.separator, c.surface)).toBeGreaterThan(1.05);
  });
});

it('text on the brand green is readable', () => {
  for (const stop of BRAND.gradient) expect(contrast(BRAND.onBrand, stop)).toBeGreaterThanOrEqual(4.5);
});
