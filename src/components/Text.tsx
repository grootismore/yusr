import type { ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { familyFor } from '@/lib/fonts';
import { i18n } from '@/lib/i18n';

/**
 * Gives a text style the app's typeface for the weight it asks for: Nunito Sans for English, MV
 * Faseyha for Dhivehi. An explicit `fontFamily` wins. The weight moves into the family name, because
 * a custom font would otherwise be bolded a second time.
 */
export function withTypeface(style: StyleProp<TextStyle>, language: string | undefined = i18n.language): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: familyFor(language, fontWeight), fontWeight: 'normal' };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withTypeface(style)} />;
}

/** `ref` is a plain prop in React 19, so a form can move focus to the next field. */
export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={withTypeface(style)} />;
}
