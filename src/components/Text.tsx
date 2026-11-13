import { Text as RNText, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFor } from '@/theme/fonts';
import { colors, LINE_HEIGHT, type, type TypeVariant } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  /** Force the Latin typeface (amounts, dates, codes). */
  latin?: boolean;
}

/**
 * The only text component. Dhivehi uses Thaana Noor, English and numbers use Nunito Sans (see
 * theme/fonts.ts); the system font is the automatic fallback if a font fails to load.
 * Thaana gets extra line height for its stacked vowel signs.
 */
export function Text({ variant = 'body', color = colors.ink, latin, style, ...rest }: AppTextProps) {
  const { i18n } = useTranslation();
  const dv = i18n.language === 'dv';
  const t = type[variant];
  return (
    <RNText
      // Dynamic Type: follow the system text size, but cap it so tab bars and chips do not break.
      maxFontSizeMultiplier={1.6}
      accessibilityRole={variant === 'title' || variant === 'display' || variant === 'heading' ? 'header' : undefined}
      accessibilityLanguage={dv && !latin ? 'dv' : 'en'}
      {...rest}
      style={[
        {
          fontFamily: fontFor(i18n.language, t.weight === 'bold', latin),
          fontSize: t.size,
          lineHeight: Math.round(t.size * LINE_HEIGHT[dv ? 'dv' : 'en']),
          color,
          writingDirection: dv ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}
