import { familyForWeight, usesNunito } from './fonts';

describe('familyForWeight', () => {
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

describe('usesNunito', () => {
  it('is on for English and unset, off for Dhivehi', () => {
    expect(usesNunito('en')).toBe(true);
    expect(usesNunito('en-GB')).toBe(true);
    expect(usesNunito(undefined)).toBe(true);
    expect(usesNunito('dv')).toBe(false);
    expect(usesNunito('DV')).toBe(false);
  });
});
