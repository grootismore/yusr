import { useEffect, useMemo, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Switch, TextInput, View, type PressableProps, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tick } from '@/lib/haptics';
import { isLtrInput } from '@/lib/inputs';
import { fontFor } from '@/theme/fonts';
import { radius, space, TOUCH, useColors, useIsDark } from '@/theme/tokens';
import { Money } from './Money';
import { Text } from './Text';

export type IconName = keyof typeof Ionicons.glyphMap;
// The database default icon "ellipsis" is not an Ionicons glyph; unknown names fall back to one that is.
export const Icon = ({ name, size = 22, color }: { name: string; size?: number; color?: string }) => {
  const colors = useColors();
  return <Ionicons name={(name in Ionicons.glyphMap ? name : 'ellipsis-horizontal') as IconName} size={size} color={color ?? colors.ink} accessible={false} importantForAccessibility="no" />;
};

/** Page: ground background, safe area, optional scroll. Sets the web preview direction. */
export function Screen({ children, scroll = true, padded = true, bleed = false, scrollY, overlay, grow = false, tabbed = false }: { children: ReactNode; scroll?: boolean; padded?: boolean; /** Let a header band run under the status bar; the screen then handles the top inset itself. */ bleed?: boolean;
  /** Share the scroll position so a header can collapse as the page scrolls. */ scrollY?: Animated.Value; /** Drawn above the scrolling content, e.g. a compact header that fades in. */ overlay?: ReactNode;
  /** Let the content fill the screen so a footer can sit at the bottom (marginTop: 'auto'). */ grow?: boolean;
  /** A tab screen: leave room for the floating tab bar. */ tabbed?: boolean }) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const inner: ViewStyle = { padding: padded ? space.lg : 0, gap: space.lg, paddingBottom: space.xxl + (tabbed ? 96 : 0), ...(grow ? { flexGrow: 1 } : {}) };
  return (
    <SafeAreaView edges={bleed ? ['left', 'right'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.ground }} {...{ dir: i18n.language === 'dv' ? 'rtl' : 'ltr' }}>
      <Backdrop />
      {scroll ? (
        <Animated.ScrollView contentContainerStyle={inner} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
          {...(scrollY ? { scrollEventThrottle: 16, onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }) } : {})}>{children}</Animated.ScrollView>
      ) : <View style={[{ flex: 1 }, inner]}>{children}</View>}
      {overlay}
    </SafeAreaView>
  );
}

/** A card: solid fill with a fine rim. Tones: warn / bad / good are tinted washes, hero is the deep-green panel. */
export const Card = ({ children, tone = 'plain', style }: { children: ReactNode; tone?: 'plain' | 'warn' | 'bad' | 'good' | 'hero'; style?: ViewStyle }) => {
  const colors = useColors();
  const dark = useIsDark();
  const fill = tone === 'hero' ? colors.hero : tone === 'warn' ? colors.amberWash : tone === 'bad' ? colors.coralWash : tone === 'good' ? colors.accentWash : colors.card;
  const rim = tone === 'warn' ? colors.amberDeep : tone === 'bad' ? colors.coral : tone === 'hero' ? 'transparent' : colors.cardEdge;
  return (
    <View
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1, borderColor: rim, backgroundColor: fill,
        ...(dark ? {} : { boxShadow: '0 1px 2px rgba(14,21,17,0.04), 0 8px 20px rgba(14,21,17,0.05)' }) }}
    >
      {tone === 'hero' ? <PanelArt /> : null}
      <View style={[{ padding: space.lg, gap: space.md }, style]}>{children}</View>
    </View>
  );
};

/** The page behind every screen: the plain ground colour. */
export function Backdrop() {
  const colors = useColors();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.ground }]} />;
}

/** Large screen title with an optional calm line under it. One place so every tab starts the same way. */
export function ScreenTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: space.xs, paddingTop: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flexShrink: 1 }}>{title}</Text>
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
      <View style={{ width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text>{title}</Text>
        {subtitle ? <Text variant="small" color={colors.inkMuted}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.inkMuted} /> : null)}
    </Pressable>
  );
}

type ButtonProps = Omit<PressableProps, 'children'> & { label: string; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; loading?: boolean; /** Override the label colour, e.g. a ghost button on a accent band. */ textColor?: string };
export function Button({ label, kind = 'primary', icon, loading, disabled, style, textColor, ...rest }: ButtonProps) {
  const colors = useColors();
  const primary = kind === 'primary' || kind === 'danger';
  const bg = kind === 'danger' ? colors.coral : kind === 'primary' ? colors.accent : 'transparent';
  const fg = textColor ?? (primary ? colors.onAccent : colors.accent);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      style={(s) => [
        { minHeight: 52, minWidth: TOUCH, paddingHorizontal: space.xl, borderRadius: radius.pill, borderCurve: 'continuous', backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm,
          borderWidth: kind === 'secondary' ? 1.5 : 0, borderColor: colors.accent, opacity: disabled ? 0.5 : s.pressed ? 0.85 : 1 },
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
        backgroundColor: selected ? colors.accent : colors.field, borderWidth: 1.5, borderColor: selected ? colors.accent : colors.control }}
    >
      {icon ? <Icon name={icon} size={18} color={selected ? colors.onAccent : colors.ink} /> : null}
      <Text variant="small" latin={/^[\d.,]+$/.test(label)} color={selected ? colors.onAccent : colors.ink}>{label}</Text>
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
          backgroundColor: flag ? colors.amberWash : colors.field, paddingHorizontal: space.lg, paddingVertical: space.sm,
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
      <Icon name={icon} color={color ?? colors.accent} />
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
  const fill = onHero ? colors.sky : state === 'over' ? colors.coral : state === 'near' ? colors.amber : colors.accent;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ height: 14, borderRadius: radius.pill, backgroundColor: onHero ? 'rgba(255,255,255,0.28)' : colors.groundDeep, overflow: 'hidden' }}>
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

/**
 * Teal header band that runs under the status bar, with an optional back arrow, an optional small eyebrow line, a title and a calm line.
 * Use inside <Screen padded={false} bleed>; pull the first card up over its lower edge with a negative top margin.
 */
export function HeaderBand({ title, subtitle, eyebrow, onBack, children }: { title: string; subtitle?: string; eyebrow?: string; onBack?: boolean; children?: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  return (
    <View style={{ backgroundColor: colors.hero, paddingTop: insets.top + space.md, paddingHorizontal: space.xl, paddingBottom: 44, gap: space.xs, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, borderCurve: 'continuous', overflow: 'hidden' }}>
      <PanelArt />
      {onBack ? (
        <View style={{ alignSelf: 'flex-start', marginStart: -space.sm }}>
          <IconButton icon={i18n.language === 'dv' ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} color={colors.onHero} onPress={() => router.back()} />
        </View>
      ) : null}
      {eyebrow ? <Text variant="heading" color={colors.onHero}>{eyebrow}</Text> : null}
      <Text variant="title" color={colors.onHero} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text variant="small" color={colors.onHero}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

/** Pill-shaped tabs for filtering one list (All / Income / Expenses). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const colors = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: radius.pill, backgroundColor: colors.groundDeep }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { tick(); onChange(o.key); }}
            style={{ flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent', boxShadow: on ? '0 1px 3px rgba(0,0,0,0.15)' : undefined }}>
            <Text variant="small" color={on ? colors.accent : colors.inkMuted} style={{ fontWeight: on ? '700' : '400' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A settings row with an icon tile and an on/off switch. */
export function SettingRow({ icon, title, subtitle, value, onValueChange, disabled, last }: { icon: IconName; title: string; subtitle?: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text>{title}</Text>
        {subtitle ? <Text variant="small" color={colors.inkMuted}>{subtitle}</Text> : null}
      </View>
      <Switch accessibilityLabel={title} value={value} disabled={disabled} trackColor={{ true: colors.accent, false: colors.control }} onValueChange={onValueChange} />
    </View>
  );
}

/** Pastel figure tile: a short label over one amount, dark text on sky or tile. */
export function Tile({ color, label, laari }: { color: string; label: string; laari: number }) {
  const colors = useColors();
  return (
    <View accessible style={{ flex: 1, minHeight: 92, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color, padding: space.lg, justifyContent: 'space-between' }}>
      <Text variant="small" color={colors.onTile}>{label}</Text>
      <Money laari={laari} variant="heading" numberOfLines={1} adjustsFontSizeToFit color={colors.onTile} />
    </View>
  );
}

/**
 * Texture for the dark figure panels: a halftone dot grid fading out from the bottom corner, and a huge outlined "MVR" behind the numbers.
 * Purely decorative, hidden from screen readers. Dots are plain views, rendered only where they are visible.
 */
export function PanelArt() {
  const colors = useColors();
  const { i18n } = useTranslation();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rtl = i18n.language === 'dv';
  const dots = useMemo(() => {
    const out: { x: number; y: number; o: number }[] = [];
    const gap = 14;
    const reach = Math.max(box.w, box.h) * 0.85;
    for (let y = gap / 2; y < box.h; y += gap) {
      for (let x = gap / 2; x < box.w; x += gap) {
        const dx = rtl ? x : box.w - x; // distance from the bottom corner on the reading-end side
        const d = Math.hypot(dx, box.h - y);
        const o = Math.max(0, 1 - d / reach) * 0.28;
        if (o > 0.03) out.push({ x, y, o });
      }
    }
    return out;
  }, [box.w, box.h, rtl]);
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}>
      {box.w > 0 ? (
        <Svg width={box.w} height={box.h} style={[StyleSheet.absoluteFill, { direction: 'ltr' }]}>
          <SvgText x={rtl ? 6 : box.w - 6} y={box.h + 14} fontSize={132} fontFamily="SpaceGrotesk_700Bold" textAnchor={rtl ? 'start' : 'end'}
            fill="none" stroke={colors.onHero} strokeWidth={1.2} strokeOpacity={0.17}>MVR</SvgText>
        </Svg>
      ) : null}
      {dots.map((d, i) => <View key={i} style={{ position: 'absolute', left: d.x - 1.2, top: d.y - 1.2, width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: colors.onHero, opacity: d.o }} />)}
    </View>
  );
}
