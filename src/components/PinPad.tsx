import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PIN_LENGTH } from '@/lib/auth/pin';
import { selectionHaptic } from '@/lib/haptics';
import { useColors } from '@/lib/theme';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']] as const;

/**
 * A 4-digit PIN entry with its own number pad (no system keyboard). The pad keeps the same layout
 * in right-to-left languages, like a phone's keypad. When the fourth digit is entered, `onComplete`
 * gets the PIN and the dots clear, ready for the next try.
 */
export function PinPad({ title, message, error, disabled, onComplete }: { title: string; message?: string; error?: string | null; disabled?: boolean; onComplete: (pin: string) => void }) {
  const { t } = useTranslation();
  const colors = useColors();
  const [digits, setDigits] = useState('');

  const press = (digit: string) => {
    if (disabled || digits.length >= PIN_LENGTH) return;
    selectionHaptic();
    const next = digits + digit;
    if (next.length === PIN_LENGTH) {
      setDigits('');
      onComplete(next);
    } else setDigits(next);
  };

  const key = (content: string, label: string, onPress?: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress || !!disabled }}
      disabled={!onPress || !!disabled}
      onPress={onPress}
      style={({ pressed }) => ({ width: 76, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: content === '' ? 'transparent' : pressed ? colors.separator : colors.surfaceMuted })}
    >
      {content === '⌫' ? <AppIcon accessible={false} name="backspace-outline" size={24} color={colors.text} /> : <Text style={{ fontSize: 26, fontWeight: '600', color: colors.text }}>{content}</Text>}
    </Pressable>
  );

  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {message ? <Text style={{ fontSize: 15, color: colors.secondaryText, textAlign: 'center' }}>{message}</Text> : null}
      <View accessible accessibilityLabel={t('lock.digitsEntered', { count: digits.length, total: PIN_LENGTH })} style={{ flexDirection: 'row', gap: 14, minHeight: 20 }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.tint, backgroundColor: i < digits.length ? colors.tint : 'transparent' }} />
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: colors.danger, textAlign: 'center', minHeight: 20 }}>{error ?? ''}</Text>
      <View style={{ gap: 12, direction: 'ltr' }}>
        {ROWS.map((row) => (
          <View key={row.join('')} style={{ flexDirection: 'row', gap: 16 }}>
            {row.map((d) => key(d, d, () => press(d)))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {key('', ' ')}
          {key('0', '0', () => press('0'))}
          {key('⌫', t('lock.backspace'), digits.length > 0 ? () => setDigits(digits.slice(0, -1)) : undefined)}
        </View>
      </View>
    </View>
  );
}
