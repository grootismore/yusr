import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Icon } from '@/components/ui';
import { LIFT, space, useColors } from '@/theme/tokens';

/**
 * The one way to add, floating above the tab bar on every tab screen, with its word beside the plus so nobody has to guess. One tap opens the keypad. Income and split pay are
 * one tap away on that screen (its Expense / Income / Split pay switch), so there is no menu in between.
 */
export function AddMenu({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', end: space.lg, bottom }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('home.addExpense')} onPress={onPress}
        style={({ pressed }) => ({ height: 58, paddingStart: space.lg, paddingEnd: space.xl, borderRadius: 29, flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: colors.accent,
          // A ring in the page colour keeps it clear of the dark panels and the tab bar it floats over.
          borderWidth: 3, borderColor: colors.ground, boxShadow: LIFT, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
        <Icon name="add" color={colors.onAccent} size={30} />
        <Text variant="label" color={colors.onAccent} style={{ fontSize: 17 }}>{t('common.add')}</Text>
      </Pressable>
    </View>
  );
}
