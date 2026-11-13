import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tick } from '@/lib/haptics';
import { pressKey, type KeypadKey } from '@/lib/keypad';
import { radius, space, useColors } from '@/theme/tokens';
import { Text } from './Text';
import { Icon } from './ui';

const ROWS: KeypadKey[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', 'back']];

/** On-screen number pad: always left-to-right with Latin digits, like the amounts it types. */
export function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ gap: space.sm }} {...{ dir: 'ltr' }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
          {row.map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k === 'back' ? t('add.backspace') : k === '.' ? t('add.point') : k}
              onPress={() => { tick(); onChange(pressKey(value, k)); }}
              style={({ pressed }) => ({ flex: 1, height: 60, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center',
                backgroundColor: k === 'back' ? colors.tealWash : colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.55 : 1 })}
            >
              {k === 'back' ? <Icon name="backspace-outline" color={colors.teal} /> : <Text latin variant="heading">{k}</Text>}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
