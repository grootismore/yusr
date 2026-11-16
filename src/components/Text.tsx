import { Children, type ReactNode } from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { hasLatin, splitScripts } from '@/lib/scripts';
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
export function Text({ variant = 'body', color, latin, style, children, ...rest }: AppTextProps) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const dv = i18n.language === 'dv';
  const t = type[variant];
  const thaana = dv && !latin;
  const size = thaana ? (t.dvSize ?? t.size) : t.size;
  // English words inside Dhivehi text (a debt called "Areesh MIB - Cycle", a friend's name) are set in the phone's own font.
  const latinRun = { ...faceFor(i18n.language, t.weight, true), fontSize: t.size, letterSpacing: t.track, writingDirection: 'ltr' as const };
  const mixed: ReactNode = thaana
    ? Children.map(children, (c) => {
        if (typeof c !== 'string' || !hasLatin(c)) return c;
        return splitScripts(c).map((r, i) => (r.latin ? <RNText key={i} style={latinRun}>{`\u2066${r.text}\u2069`}</RNText> : r.text));
      })
    : children;
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
    >{mixed}</RNText>
  );
}
