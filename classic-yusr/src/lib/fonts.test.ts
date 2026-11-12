import { familyFor, familyForWeight, isDhivehi, thaanaFamilyForWeight } from './fonts';

describe('familyForWeight (Nunito Sans, English)', () => {
  it('picks the family for each weight the app uses', () => {
    expect(familyForWeight(undefined)).toBe('NunitoSans_400Regular');
    expect(familyForWeight('normal')).toBe('NunitoSans_400Regular');
    expect(familyForWeight('400')).toBe('NunitoSans_400Regular');
    expect(familyForWeight('600')).toBe('NunitoSans_600SemiBold');
    expect(familyForWeight('700')).toBe('NunitoSans_700Bold');
    expect(familyForWeight('bold')).toBe('NunitoSans_700Bold');
    expect(familyForWeight('800')).toBe('NunitoSans_800ExtraBold');
    expect(familyForWeight(900)).toBe('NunitoSans_800ExtraBold');
  });
  it('treats an odd value as regular rather than failing', () => {
    expect(familyForWeight('heavyish')).toBe('NunitoSans_400Regular');
  });
});

describe('thaanaFamilyForWeight (MV Faseyha, Dhivehi)', () => {
  it('has two weights: regular below semibold, bold from semibold up', () => {
    expect(thaanaFamilyForWeight(undefined)).toBe('MVFaseyha_Regular');
    expect(thaanaFamilyForWeight('normal')).toBe('MVFaseyha_Regular');
    expect(thaanaFamilyForWeight('400')).toBe('MVFaseyha_Regular');
    expect(thaanaFamilyForWeight('500')).toBe('MVFaseyha_Regular');
    expect(thaanaFamilyForWeight('600')).toBe('MVFaseyha_Bold');
    expect(thaanaFamilyForWeight('700')).toBe('MVFaseyha_Bold');
    expect(thaanaFamilyForWeight('bold')).toBe('MVFaseyha_Bold');
    expect(thaanaFamilyForWeight('800')).toBe('MVFaseyha_Bold');
    expect(thaanaFamilyForWeight('heavyish')).toBe('MVFaseyha_Regular');
  });
});

describe('familyFor', () => {
  it('uses MV Faseyha for Dhivehi and Nunito Sans for everything else', () => {
    expect(familyFor('dv', '700')).toBe('MVFaseyha_Bold');
    expect(familyFor('DV', undefined)).toBe('MVFaseyha_Regular');
    expect(familyFor('en', '700')).toBe('NunitoSans_700Bold');
    expect(familyFor('en-GB', '800')).toBe('NunitoSans_800ExtraBold');
    expect(familyFor(undefined, '400')).toBe('NunitoSans_400Regular');
  });
  it('knows which language is Dhivehi', () => {
    expect(isDhivehi('dv')).toBe(true);
    expect(isDhivehi('en')).toBe(false);
    expect(isDhivehi(undefined)).toBe(false);
  });
});
