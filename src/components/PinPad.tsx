import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tick } from '@/lib/haptics';
import { PIN_LENGTH } from '@/lib/pin';
import { radius, space, useColors } from '@/theme/tokens';
import { Text } from './Text';
import { Icon } from './ui';

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'back']];

/** Dots plus a digit pad. Calls onChange with the digits typed so far; the caller reacts when it reaches PIN_LENGTH. */
export function PinPad({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const press = (k: string) => {
    if (disabled) return;
    tick();
    onChange(k === 'back' ? value.slice(0, -1) : value.length < PIN_LENGTH ? value + k : value);
  };
  return (
    <View style={{ gap: space.lg, alignItems: 'center', width: '100%', maxWidth: 320 }} {...{ dir: 'ltr' }}>
      <View style={{ flexDirection: 'row', gap: space.md }} accessibilityLabel={t('pin.entered', { count: value.length, total: PIN_LENGTH })}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: i < value.length ? colors.accent : 'transparent' }} />
        ))}
      </View>
      <View style={{ gap: space.sm, width: '100%' }}>
        {ROWS.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
            {row.map((k, j) => k === '' ? <View key={j} style={{ flex: 1 }} /> : (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === 'back' ? t('add.backspace') : k} onPress={() => press(k)}
                style={({ pressed }) => ({ flex: 1, height: 60, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: k === 'back' ? colors.accentWash : colors.field, borderWidth: 1, borderColor: colors.cardEdge, opacity: pressed || disabled ? 0.55 : 1 })}>
                {k === 'back' ? <Icon name="backspace-outline" color={colors.accent} /> : <Text latin variant="heading">{k}</Text>}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
