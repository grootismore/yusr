import type { ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { familyFor, isDhivehi } from '@/lib/fonts';
import { i18n } from '@/lib/i18n';

/**
 * Thaana letters sit smaller on the line than Latin ones at the same point size, so small text
 * (captions, hints, 13 to 15 pt) is hard to read in Dhivehi. Under 16 pt it is enlarged by 15%.
 */
export const thaanaSize = (size: number): number => (size < 16 ? Math.round(size * 1.15) : size);

/**
 * Gives a text style the app's typeface for the weight it asks for: Nunito Sans for English, MV
 * Faseyha for Dhivehi. An explicit `fontFamily` wins. The weight moves into the family name, because
 * a custom font would otherwise be bolded a second time.
 */
export function withTypeface(style: StyleProp<TextStyle>, language: string | undefined = i18n.language): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  const { fontWeight, ...rest } = flat;
  const thaana = isDhivehi(language);
  const sized = {
    ...rest,
    ...(thaana && typeof rest.fontSize === 'number' ? { fontSize: thaanaSize(rest.fontSize) } : {}),
    ...(thaana && typeof rest.lineHeight === 'number' && typeof rest.fontSize === 'number' && rest.fontSize < 16
      ? { lineHeight: Math.round(rest.lineHeight * 1.15) }
      : {}),
  };
  return { ...sized, fontFamily: familyFor(language, fontWeight), fontWeight: 'normal' };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withTypeface(style)} />;
}

/** `ref` is a plain prop in React 19, so a form can move focus to the next field. */
export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={withTypeface(style)} />;
}
