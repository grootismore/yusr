import { headerFontOptions } from './headerFonts';

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
