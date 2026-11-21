import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui';
import { LIFT, space, useColors } from '@/theme/tokens';

/**
 * The one way to add, floating above the tab bar on every tab screen. One tap opens the keypad. Income and split pay are
 * one tap away on that screen (its Expense / Income / Split pay switch), so there is no menu in between.
 */
export function AddMenu({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', end: space.lg, bottom }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('home.addExpense')} onPress={onPress}
        style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, boxShadow: LIFT, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
        <Icon name="add" color={colors.onAccent} size={30} />
      </Pressable>
    </View>
  );
}
