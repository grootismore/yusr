import { headerFontOptions, largeTitleOptions } from './headerFonts';

describe('headerFontOptions', () => {
  it('puts the app typefaces on the navigation bar titles', () => {
    expect(headerFontOptions('en')).toEqual({
      headerTitleStyle: { fontFamily: 'NunitoSans_700Bold' },
      headerLargeTitleStyle: { fontFamily: 'NunitoSans_800ExtraBold' },
      headerBackTitleStyle: { fontFamily: 'NunitoSans_400Regular' },
    });
    expect(headerFontOptions('dv')).toEqual({
      headerTitleStyle: { fontFamily: 'MVFaseyha_Bold' },
      headerLargeTitleStyle: { fontFamily: 'MVFaseyha_Bold' },
      headerBackTitleStyle: { fontFamily: 'MVFaseyha_Regular' },
    });
  });
});

describe('largeTitleOptions', () => {
  it('keeps the native large title in English and switches it off (with the small title) in right-to-left', () => {
    expect(largeTitleOptions(false)).toEqual({ headerLargeTitle: true });
    expect(largeTitleOptions(true)).toEqual({ headerLargeTitle: false, headerTitle: '' });
  });
});
