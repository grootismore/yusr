import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type PressableProps, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tick } from '@/lib/haptics';
import { fontFor } from '@/theme/fonts';
import { colors, radius, space, TOUCH } from '@/theme/tokens';
import { Text } from './Text';

export type IconName = keyof typeof Ionicons.glyphMap;
// The database default icon "ellipsis" is not an Ionicons glyph; unknown names fall back to one that is.
export const Icon = ({ name, size = 22, color = colors.ink }: { name: string; size?: number; color?: string }) => (
  <Ionicons name={(name in Ionicons.glyphMap ? name : 'ellipsis-horizontal') as IconName} size={size} color={color} accessible={false} importantForAccessibility="no" />
);

/** Page: sand background, safe area, optional scroll. Sets the web preview direction. */
export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const { i18n } = useTranslation();
  const inner: ViewStyle = { padding: padded ? space.lg : 0, gap: space.lg, paddingBottom: space.xxl };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.sand }} {...{ dir: i18n.language === 'dv' ? 'rtl' : 'ltr' }}>
      {scroll ? <ScrollView contentContainerStyle={inner} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[{ flex: 1 }, inner]}>{children}</View>}
    </SafeAreaView>
  );
}

export const Card = ({ children, tone = 'plain', style }: { children: ReactNode; tone?: 'plain' | 'warn' | 'bad' | 'good'; style?: ViewStyle }) => (
  <View
    style={[
      { backgroundColor: tone === 'warn' ? colors.amberWash : tone === 'bad' ? colors.coralWash : tone === 'good' ? colors.tealWash : colors.surface,
        borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md, borderWidth: 1, borderColor: tone === 'warn' ? colors.amberDeep : tone === 'bad' ? colors.coral : colors.line },
      style,
    ]}
  >
    {children}
  </View>
);

type ButtonProps = Omit<PressableProps, 'children'> & { label: string; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; loading?: boolean };
export function Button({ label, kind = 'primary', icon, loading, disabled, style, ...rest }: ButtonProps) {
  const primary = kind === 'primary' || kind === 'danger';
  const bg = kind === 'danger' ? colors.coral : kind === 'primary' ? colors.teal : 'transparent';
  const fg = primary ? colors.onTeal : colors.teal;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      style={(s) => [
        { minHeight: 52, minWidth: TOUCH, paddingHorizontal: space.xl, borderRadius: radius.pill, borderCurve: 'continuous', backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm,
          borderWidth: kind === 'secondary' ? 1.5 : 0, borderColor: colors.teal, opacity: disabled ? 0.5 : s.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(s) : style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} /> : null}
      <Text variant="label" color={fg}>{label}</Text>
    </Pressable>
  );
}

/** Round icon-only or text chip, at least 44 pt tall. */
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => { tick(); onPress(); }}
      style={{ minHeight: TOUCH, paddingHorizontal: space.lg, borderRadius: radius.pill, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: space.xs,
        backgroundColor: selected ? colors.teal : colors.surface, borderWidth: 1.5, borderColor: selected ? colors.teal : colors.control }}
    >
      {icon ? <Icon name={icon} size={18} color={selected ? colors.onTeal : colors.ink} /> : null}
      <Text variant="small" color={selected ? colors.onTeal : colors.ink}>{label}</Text>
    </Pressable>
  );
}

/** Labelled input. `flag` marks a field the scanner was unsure about: amber border plus words, never colour alone. */
export function Field({ label, error, flag, hint, ...rest }: TextInputProps & { label: string; error?: string | null; flag?: boolean; hint?: string }) {
  const { t, i18n } = useTranslation();
  const bad = !!error;
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{label}</Text>
      {hint ? <Text variant="small" color={colors.inkMuted}>{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMuted}
        {...rest}
        style={[{ minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: flag || bad ? 2.5 : 1.5, borderColor: bad ? colors.coral : flag ? colors.amberDeep : colors.control,
          backgroundColor: flag ? colors.amberWash : colors.surface, paddingHorizontal: space.lg, paddingVertical: space.sm,
          fontFamily: fontFor(i18n.language, false, rest.keyboardType === 'decimal-pad' || rest.keyboardType === 'numbers-and-punctuation' || rest.keyboardType === 'email-address'), fontSize: 17, color: colors.ink, writingDirection: i18n.language === 'dv' ? 'rtl' : 'ltr' }, rest.style]}
      />
      {flag && !bad ? (
        <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
          <Icon name="alert-circle" size={18} color={colors.amberDeep} />
          <Text variant="small">{t('confirm.checkThis')} — {t('confirm.lowConfidence')}</Text>
        </View>
      ) : null}
      {bad ? <Text variant="small" color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

export function ProgressBar({ percent, state, label }: { percent: number; state: 'ok' | 'near' | 'over'; label: string }) {
  const fill = state === 'over' ? colors.coral : state === 'near' ? colors.amber : colors.teal;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ height: 12, borderRadius: radius.pill, backgroundColor: colors.sandDeep, overflow: 'hidden' }}>
      <View style={{ width: `${percent}%`, height: '100%', backgroundColor: fill, borderRadius: radius.pill }} />
    </View>
  );
}

export const Row = ({ children, style, ...rest }: ViewProps & { children: ReactNode; style?: ViewStyle }) => (
  <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>
);
