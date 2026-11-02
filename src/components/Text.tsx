import { StyleSheet, Text as RNText, TextInput as RNTextInput, type StyleProp, type TextInputProps, type TextProps, type TextStyle } from 'react-native';
import { familyForWeight, usesNunito } from '@/lib/fonts';
import { i18n } from '@/lib/i18n';

/**
 * Gives a text style its Nunito Sans family for the weight it asks for. An explicit `fontFamily`
 * wins, and Dhivehi is left on the system font. The weight moves into the family name, because a
 * custom font would otherwise be bolded a second time.
 */
export function withTypeface(style: StyleProp<TextStyle>, language: string | undefined = i18n.language): StyleProp<TextStyle> {
  if (!usesNunito(language)) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: familyForWeight(fontWeight), fontWeight: 'normal' };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withTypeface(style)} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={withTypeface(style)} />;
}
