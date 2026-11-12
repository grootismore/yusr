import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Text, TextInput, withTypeface } from './Text';

jest.mock('@/lib/i18n', () => ({ i18n: { language: 'en' } }));

describe('withTypeface', () => {
  it('moves the weight into the Nunito Sans family name and clears the weight', () => {
    expect(withTypeface({ fontSize: 17, fontWeight: '700' }, 'en')).toEqual({ fontSize: 17, fontFamily: 'NunitoSans_700Bold', fontWeight: 'normal' });
    expect(withTypeface({ fontSize: 13 }, 'en')).toMatchObject({ fontFamily: 'NunitoSans_400Regular' });
  });
  it('flattens style arrays and lets later styles win', () => {
    expect(withTypeface([{ fontSize: 13, fontWeight: '600' }, { fontWeight: '800' }], 'en')).toMatchObject({ fontSize: 13, fontFamily: 'NunitoSans_800ExtraBold' });
  });
  it('leaves an explicit family alone', () => {
    const style = { fontFamily: 'Menlo', fontWeight: '700' as const };
    expect(withTypeface(style, 'en')).toBe(style);
  });
  it('uses MV Faseyha for Dhivehi, bold from semibold up', () => {
    expect(withTypeface({ fontSize: 17, fontWeight: '600' }, 'dv')).toEqual({ fontSize: 17, fontFamily: 'MVFaseyha_Bold', fontWeight: 'normal' });
    expect(withTypeface({ fontSize: 17 }, 'dv')).toMatchObject({ fontFamily: 'MVFaseyha_Regular' });
  });
});

describe('small Dhivehi text', () => {
  it('is enlarged under 16 pt so Thaana stays readable, and left alone from 16 pt up', () => {
    expect(withTypeface({ fontSize: 13 }, 'dv')).toMatchObject({ fontSize: 15 });
    expect(withTypeface({ fontSize: 15, lineHeight: 20 }, 'dv')).toMatchObject({ fontSize: 17, lineHeight: 23 });
    expect(withTypeface({ fontSize: 17 }, 'dv')).toMatchObject({ fontSize: 17 });
    expect(withTypeface({ fontSize: 13 }, 'en')).toMatchObject({ fontSize: 13 }); // English unchanged
  });
});

describe('Text and TextInput', () => {
  it('render with the family for their weight', async () => {
    await render(
      <>
        <Text style={{ fontWeight: '800' }}>Heading</Text>
        <TextInput accessibilityLabel="Name" style={{ fontSize: 17 }} />
      </>,
    );
    expect(StyleSheet.flatten(screen.getByText('Heading').props.style).fontFamily).toBe('NunitoSans_800ExtraBold');
    expect(StyleSheet.flatten(screen.getByLabelText('Name').props.style).fontFamily).toBe('NunitoSans_400Regular');
  });
});
