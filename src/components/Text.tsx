import { Text as RNText, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { faceFor } from '@/theme/fonts';
import { DV_LINE_HEIGHT, type, type TypeVariant, useColors } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  /** Force the Latin typeface (amounts, dates, codes). */
  latin?: boolean;
}

/**
 * The only text component. Dhivehi uses Thaana Noor, English and numbers use the phone's system font (see
 * theme/fonts.ts). Thaana gets extra line height for its stacked vowel signs.
 */
export function Text({ variant = 'body', color, latin, style, ...rest }: AppTextProps) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const dv = i18n.language === 'dv';
  const t = type[variant];
  const thaana = dv && !latin;
  const size = thaana ? (t.dvSize ?? t.size) : t.size;
  return (
    <RNText
      // Dynamic Type: follow the system text size, but cap it so tab bars and chips do not break.
      maxFontSizeMultiplier={1.6}
      accessibilityRole={variant === 'largeTitle' || variant === 'title' || variant === 'display' || variant === 'heading' ? 'header' : undefined}
      accessibilityLanguage={dv && !latin ? 'dv' : 'en'}
      {...rest}
      style={[
        {
          ...faceFor(i18n.language, t.weight, latin),
          fontSize: size,
          lineHeight: Math.round(size * (dv ? DV_LINE_HEIGHT : t.lh)),
          ...(thaana ? {} : { letterSpacing: t.track }),
          color: color ?? colors.ink,
          writingDirection: dv ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}
