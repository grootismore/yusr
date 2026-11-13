import { useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, ScrollView, TextInput, View, type PressableProps, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tick } from '@/lib/haptics';
import { isLtrInput } from '@/lib/inputs';
import { fontFor } from '@/theme/fonts';
import { radius, space, TOUCH, useColors } from '@/theme/tokens';
import { Text } from './Text';

export type IconName = keyof typeof Ionicons.glyphMap;
// The database default icon "ellipsis" is not an Ionicons glyph; unknown names fall back to one that is.
export const Icon = ({ name, size = 22, color }: { name: string; size?: number; color?: string }) => {
  const colors = useColors();
  return <Ionicons name={(name in Ionicons.glyphMap ? name : 'ellipsis-horizontal') as IconName} size={size} color={color ?? colors.ink} accessible={false} importantForAccessibility="no" />;
};

/** Page: sand background, safe area, optional scroll. Sets the web preview direction. */
export function Screen({ children, scroll = true, padded = true, bleed = false }: { children: ReactNode; scroll?: boolean; padded?: boolean; /** Let a header band run under the status bar; the screen then handles the top inset itself. */ bleed?: boolean }) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const inner: ViewStyle = { padding: padded ? space.lg : 0, gap: space.lg, paddingBottom: space.xxl };
  return (
    <SafeAreaView edges={bleed ? ['left', 'right'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.sand }} {...{ dir: i18n.language === 'dv' ? 'rtl' : 'ltr' }}>
      {scroll ? <ScrollView contentContainerStyle={inner} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[{ flex: 1 }, inner]}>{children}</View>}
    </SafeAreaView>
  );
}

export const Card = ({ children, tone = 'plain', style }: { children: ReactNode; tone?: 'plain' | 'warn' | 'bad' | 'good' | 'hero'; style?: ViewStyle }) => {
  const colors = useColors();
  const dark = colors.sand === '#101614';
  const bg = tone === 'hero' ? colors.teal : tone === 'warn' ? colors.amberWash : tone === 'bad' ? colors.coralWash : tone === 'good' ? colors.tealWash : colors.surface;
  const border = tone === 'warn' ? colors.amberDeep : tone === 'bad' ? colors.coral : tone === 'hero' ? 'transparent' : colors.line;
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md, borderWidth: 1, borderColor: border,
          // A soft lift on the sand background; dark mode relies on the surface step and hairline instead.
          ...(dark ? {} : { boxShadow: '0 1px 2px rgba(21,33,31,0.05), 0 6px 16px rgba(21,33,31,0.06)' }) },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/** Large screen title with an optional calm line under it. One place so every tab starts the same way. */
export function ScreenTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: space.xs, paddingTop: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="display" style={{ flexShrink: 1 }}>{title}</Text>
        {trailing}
      </Row>
      {subtitle ? <Text color={colors.inkMuted}>{subtitle}</Text> : null}
    </View>
  );
}

/** Tappable list row: icon tile, title, optional second line, trailing chevron that follows the reading direction. */
export function ListRow({ icon, title, subtitle, onPress, trailing, last }: { icon: IconName; title: string; subtitle?: string; onPress?: () => void; trailing?: ReactNode; last?: boolean }) {
  const colors = useColors();
  const { i18n } = useTranslation();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress ? () => { tick(); onPress(); } : undefined}
      style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text>{title}</Text>
        {subtitle ? <Text variant="small" color={colors.inkMuted}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.inkMuted} /> : null)}
    </Pressable>
  );
}

type ButtonProps = Omit<PressableProps, 'children'> & { label: string; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; loading?: boolean; /** Override the label colour, e.g. a ghost button on a teal band. */ textColor?: string };
export function Button({ label, kind = 'primary', icon, loading, disabled, style, textColor, ...rest }: ButtonProps) {
  const colors = useColors();
  const primary = kind === 'primary' || kind === 'danger';
  const bg = kind === 'danger' ? colors.coral : kind === 'primary' ? colors.teal : 'transparent';
  const fg = textColor ?? (primary ? colors.onTeal : colors.teal);
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
  const colors = useColors();
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
export function Field({ label, error, flag, hint, trailing, inputRef, ...rest }: TextInputProps & { label: string; error?: string | null; flag?: boolean; hint?: string; trailing?: ReactNode; inputRef?: Ref<ComponentRef<typeof TextInput>> }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const bad = !!error;
  const ltr = isLtrInput(rest);
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{label}</Text>
      {hint ? <Text variant="small" color={colors.inkMuted}>{hint}</Text> : null}
      <View>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMuted}
        {...rest}
        style={[{ minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: flag || bad ? 2.5 : 1.5, borderColor: bad ? colors.coral : flag ? colors.amberDeep : colors.control,
          backgroundColor: flag ? colors.amberWash : colors.surface, paddingHorizontal: space.lg, paddingVertical: space.sm,
          fontFamily: fontFor(i18n.language, false, rest.keyboardType === 'decimal-pad' || rest.keyboardType === 'numbers-and-punctuation' || rest.keyboardType === 'email-address'), fontSize: 17, color: colors.ink, ...(ltr ? { writingDirection: 'ltr', textAlign: 'left' } : { writingDirection: i18n.language === 'dv' ? 'rtl' : 'ltr' }) }, rest.style]}
        {...(ltr ? { dir: 'ltr' } : {})}
      />
      {trailing ? <View style={{ position: 'absolute', top: 0, bottom: 0, right: 4, justifyContent: 'center' }}>{trailing}</View> : null}
      </View>
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

/** A 44-point icon-only button. The label is what a screen reader says. */
export function IconButton({ icon, label, onPress, disabled, color }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
      <Icon name={icon} color={color ?? colors.teal} />
    </Pressable>
  );
}

/** The bar fills in once when it appears and eases when the value changes; no motion at all if Reduce Motion is on. */
function Fill({ percent, color }: { percent: number; color: string }) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live) return;
      if (reduce) value.setValue(percent);
      else Animated.timing(value, { toValue: percent, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    });
    return () => { live = false; };
  }, [percent, value]);
  return <Animated.View style={{ width: value.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }), height: '100%', backgroundColor: color, borderRadius: radius.pill }} />;
}

export function ProgressBar({ percent, state, label, onHero }: { percent: number; state: 'ok' | 'near' | 'over'; label: string; onHero?: boolean }) {
  const colors = useColors();
  const fill = onHero ? colors.onTeal : state === 'over' ? colors.coral : state === 'near' ? colors.amber : colors.teal;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ height: 14, borderRadius: radius.pill, backgroundColor: onHero ? 'rgba(255,255,255,0.28)' : colors.sandDeep, overflow: 'hidden' }}>
      <Fill percent={percent} color={fill} />
    </View>
  );
}

export const Row = ({ children, style, ...rest }: ViewProps & { children: ReactNode; style?: ViewStyle }) => (
  <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>
);

/** Header for pushed screens: a 44 pt back arrow at the start edge (mirrored in Dhivehi) and the title beside it. */
export function StackHeader({ title, numberOfLines }: { title: string; numberOfLines?: number }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  return (
    <Row style={{ gap: space.xs }}>
      <IconButton icon={i18n.language === 'dv' ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={() => router.back()} />
      <Text variant="title" style={{ flex: 1 }} numberOfLines={numberOfLines}>{title}</Text>
    </Row>
  );
}
