import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Icon } from '@/components/ui';
import { tick } from '@/lib/haptics';
import { radius, useColors } from '@/theme/tokens';
import type { KbTarget } from './context';
import { LETTERS, LOAN, PUNCTUATION, SIGNS } from './thaana';

const KEY_H = 46, GAP = 6, PAD = 8;
/** Five rows and their gaps, without the bottom inset. */
export const KEYBOARD_HEIGHT = KEY_H * 5 + GAP * 4 + PAD * 2;

/** The Thaana keyboard for Dhivehi text fields. It sits at the bottom of the screen, right to left, and never covers the page for good. */
export function ThaanaKeyboard({ target }: { target: KbTarget }) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loan, setLoan] = useState(false);
  const repeat = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (repeat.current) { clearTimeout(repeat.current as ReturnType<typeof setTimeout>); clearInterval(repeat.current as ReturnType<typeof setInterval>); repeat.current = null; } };
  useEffect(() => stop, []);

  const key = (label: string, onPress: () => void, opts: { flex?: number; plain?: boolean; a11y?: string; icon?: string; sign?: boolean } = {}) => (
    <Pressable key={label + (opts.icon ?? '')} accessibilityRole="button" accessibilityLabel={opts.a11y ?? label} onPress={() => { tick(); onPress(); }}
      style={({ pressed }) => ({ flex: opts.flex ?? 1, minWidth: 0, height: KEY_H, borderRadius: radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
        backgroundColor: opts.plain ? colors.field : colors.card, borderWidth: 1, borderColor: colors.cardEdge, opacity: pressed ? 0.55 : 1 })}>
      {opts.icon ? <Icon name={opts.icon} size={22} color={colors.ink} /> : <Text variant="heading" latin={/^[A-Za-z]/.test(label)} color={colors.ink} numberOfLines={1} adjustsFontSizeToFit>{opts.sign ? `◌${label}` : label}</Text>}
    </Pressable>
  );
  const row = (keys: React.ReactNode, k: string) => <View key={k} style={{ flexDirection: 'row', gap: GAP }}>{keys}</View>;
  const letters = loan ? LOAN : LETTERS;

  return (
    // Rows are listed from the right, so the whole keyboard reads right to left.
    <View accessibilityViewIsModal={false} {...{ dir: 'rtl' }} style={{ backgroundColor: colors.groundDeep, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: PAD, paddingTop: PAD, paddingBottom: PAD + insets.bottom, gap: GAP }}>
      {letters.map((r, i) => row(<>
        {r.map((c) => key(c, () => target.press(c)))}
        {i === letters.length - 1 && !loan ? (
          <Pressable key="back" accessibilityRole="button" accessibilityLabel={t('kb.backspace')}
            onPressIn={() => { tick(); target.backspace(); stop(); repeat.current = setTimeout(() => { repeat.current = setInterval(() => target.backspace(), 70); }, 380); }} onPressOut={stop}
            style={({ pressed }) => ({ flex: 2, height: KEY_H, borderRadius: radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.cardEdge, opacity: pressed ? 0.55 : 1 })}>
            <Icon name="backspace-outline" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </>, `l${i}${loan}`))}
      {loan ? row(<>{key('', () => target.backspace(), { icon: 'backspace-outline', a11y: t('kb.backspace'), plain: true })}</>, 'loan-back') : null}
      {row(SIGNS.map((s) => key(s, () => target.press(s), { sign: true })), 'signs')}
      {row(<>
        {key('', () => target.hide(), { icon: 'chevron-down', a11y: t('kb.hide'), plain: true })}
        {key(loan ? t('kb.letters') : t('kb.more'), () => setLoan(!loan), { plain: true, flex: 1.4 })}
        {key('ABC', () => target.system(), { plain: true, a11y: t('kb.english') })}
        {key(t('kb.space'), () => target.press(' '), { flex: 3 })}
        {PUNCTUATION.map((p) => key(p, () => target.press(p)))}
        {key('', () => target.enter(), { icon: 'return-down-back', a11y: t('kb.return'), plain: true })}
      </>, 'bottom')}
    </View>
  );
}
