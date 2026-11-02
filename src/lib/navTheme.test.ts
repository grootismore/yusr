import { navigationTheme } from './navTheme';
import type { Colors } from './theme';

const colors: Colors = { background: '#000000', surface: '#1C1C1E', text: '#FFFFFF', secondaryText: '#AEAEB2', separator: '#38383A', tint: '#5CC49A', danger: '#FF6961' };

describe('navigationTheme', () => {
  it('uses the app colours so titles and header buttons are readable in dark mode', () => {
    const theme = navigationTheme('dark', colors);
    expect(theme.dark).toBe(true);
    expect(theme.colors).toMatchObject({ text: '#FFFFFF', background: '#000000', primary: '#5CC49A', border: '#38383A' });
  });
  it('keeps the light theme light', () => {
    const light = { ...colors, background: '#F2F2F7', text: '#1C1C1E', tint: '#0D4E3A' };
    const theme = navigationTheme('light', light);
    expect(theme.dark).toBe(false);
    expect(theme.colors).toMatchObject({ text: '#1C1C1E', background: '#F2F2F7', primary: '#0D4E3A' });
  });
  it('keeps the other theme fields (fonts) from the base theme', () => {
    expect(navigationTheme('dark', colors).fonts).toBeDefined();
  });
});
