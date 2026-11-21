import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Icon } from '@/components/ui';
import { tick } from '@/lib/haptics';
import { radius, useColors } from '@/theme/tokens';
import type { KbTarget } from './context';
import { NUMBERS, ROWS, SYMBOLS, isSign } from './thaana';

const KEY_H = 44, GAP = 6, PAD = 6, BAR_H = 32;
/** The tool bar, six rows and their gaps, without the bottom inset. */
export const KEYBOARD_HEIGHT = BAR_H + KEY_H * 5 + GAP * 5 + PAD * 2;

/**
 * The Thaana keyboard for Dhivehi text fields, laid out like the standard Dhivehi (Maldives) keyboard: the letters sit on the
 * QWERTY positions, Shift gives the second letter on each key, and the symbols page has the punctuation. It sits at the bottom
 * of the screen and never covers the page for good.
 */
export function ThaanaKeyboard({ target }: { target: KbTarget }) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [shift, setShift] = useState(false);
  const [symbols, setSymbols] = useState(false);
  const repeat = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (repeat.current) { clearTimeout(repeat.current as ReturnType<typeof setTimeout>); clearInterval(repeat.current as ReturnType<typeof setInterval>); repeat.current = null; } };
  useEffect(() => stop, []);

  const press = (ch: string) => { target.press(ch); if (shift) setShift(false); }; // Shift is for one key, like on the phone's own keyboard

  const cap = (label: string, onPress: () => void, o: { flex?: number; fn?: boolean; a11y?: string; on?: boolean; children?: ReactNode } = {}) => (
    <Pressable key={label + (o.a11y ?? '')} accessibilityRole="button" accessibilityLabel={o.a11y ?? label} accessibilityState={o.on !== undefined ? { selected: o.on } : undefined} onPress={() => { tick(); onPress(); }}
      style={({ pressed }) => ({ flex: o.flex ?? 1, minWidth: 0, height: KEY_H, borderRadius: radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
        backgroundColor: o.on ? colors.accent : o.fn ? colors.field : colors.card, borderWidth: 1, borderColor: colors.cardEdge, opacity: pressed ? 0.55 : 1 })}>
      {o.children}
    </Pressable>
  );
  const text = (label: string, color: string = colors.ink, size?: number) => (
    <Text variant="heading" latin={/^[A-Za-z0-9!-/:-@[-`{-~]/.test(label)} color={color} numberOfLines={1} adjustsFontSizeToFit style={size ? { fontSize: size, lineHeight: size + 10 } : undefined}>{isSign(label) ? `◌${label}` : /^[A-Za-z0-9!-/:-@[-`{-~÷×]/.test(label) ? `\u2066${label}\u2069` : label}</Text>
  );
  const row = (keys: ReactNode, key: string, inset = 0) => <View key={key} style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: inset }}>{keys}</View>;
  const backspace = (flex = 1.5) => (
    <Pressable key="back" accessibilityRole="button" accessibilityLabel={t('kb.backspace')}
      onPressIn={() => { tick(); target.backspace(); stop(); repeat.current = setTimeout(() => { repeat.current = setInterval(() => target.backspace(), 70); }, 380); }} onPressOut={stop}
      style={({ pressed }) => ({ flex, height: KEY_H, borderRadius: radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.cardEdge, opacity: pressed ? 0.55 : 1 })}>
      <Icon name="backspace-outline" size={22} color={colors.ink} />
    </Pressable>
  );

  const letter = (r: (typeof ROWS)[number][number]) => {
    const ch = shift && r.shift ? r.shift : r.base;
    return cap(r.latin + ch, () => press(ch), { a11y: ch, children: (
      <>
        {text(ch, colors.ink, 22)}
        <Text latin variant="small" color={colors.inkMuted} style={{ position: 'absolute', bottom: 1, end: 4, fontSize: 9, lineHeight: 11 }}>{r.latin}</Text>
      </>
    ) });
  };

  return (
    // The layout is physical, like QWERTY: Q is always on the left, whatever the language of the screen.
    <View accessibilityViewIsModal={false} style={{ direction: 'ltr', backgroundColor: colors.groundDeep, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: PAD, paddingTop: PAD, paddingBottom: PAD + insets.bottom, gap: GAP }}>
      <View style={{ height: BAR_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('kb.english')} hitSlop={8} onPress={() => { tick(); target.system(); }} style={{ paddingHorizontal: 12, height: BAR_H, justifyContent: 'center' }}>
          <Text latin variant="label" color={colors.ink}>ABC</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('kb.hide')} hitSlop={8} onPress={() => { tick(); target.hide(); }} style={{ paddingHorizontal: 12, height: BAR_H, justifyContent: 'center' }}>
          <Icon name="chevron-down" size={22} color={colors.inkMuted} />
        </Pressable>
      </View>

      {row(NUMBERS.map((n) => cap(n.base, () => press(shift ? n.shift : n.base), { a11y: shift ? n.shift : n.base, children: text(shift ? n.shift : n.base) })), 'numbers')}

      {symbols ? (
        <>
          {row(SYMBOLS[0].map((s) => cap(s, () => target.press(s), { children: text(s) })), 's0')}
          {row(SYMBOLS[1].map((s) => cap(s, () => target.press(s), { children: text(s) })), 's1')}
          {row(<>{SYMBOLS[2].map((s) => cap(s, () => target.press(s), { children: text(s) }))}{backspace(1.5)}</>, 's2')}
        </>
      ) : (
        <>
          {row(ROWS[0].map(letter), 'r0')}
          {row(ROWS[1].map(letter), 'r1', 14)}
          {row(<>
            {cap('shift', () => setShift(!shift), { flex: 1.5, fn: true, on: shift, a11y: t('kb.shift'), children: <Icon name={shift ? 'arrow-up-circle' : 'arrow-up-outline'} size={24} color={shift ? colors.onAccent : colors.ink} /> })}
            {ROWS[2].map(letter)}
            {backspace(1.5)}
          </>, 'r2')}
        </>
      )}

      {row(<>
        {cap('symbols', () => { setSymbols(!symbols); setShift(false); }, { flex: 1.5, fn: true, on: symbols, a11y: symbols ? t('kb.letters') : t('kb.symbols'), children: text(symbols ? 'އަކުރު' : '!#1', symbols ? colors.onAccent : colors.ink) })}
        {cap('?', () => target.press(symbols ? '?' : '؟'), { children: text(symbols ? '?' : '؟') })}
        {cap('space', () => target.press(' '), { flex: 4, children: <Text variant="small" color={colors.inkMuted} numberOfLines={1}>{t('kb.space')}</Text>, a11y: t('kb.space') })}
        {cap('.', () => target.press('.'), { children: text('.') })}
        {cap('enter', () => target.enter(), { flex: 1.5, fn: true, a11y: t('kb.return'), children: <Icon name="return-down-back" size={22} color={colors.ink} /> })}
      </>, 'bottom')}
    </View>
  );
}
