import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Icon, type IconName } from '@/components/ui';
import { LIFT, space, useColors } from '@/theme/tokens';

export type AddKind = 'expense' | 'income' | 'split';

/**
 * The one way to add:  a round plus floating above the tab bar, always in reach. Tap it and it opens into the three
 * things you can add (an expense, income, a split payday); tap away to close. On every tab screen.
 */
export function AddMenu({ bottom, onPick }: { bottom: number; onPick: (kind: AddKind) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const options: { kind: AddKind; icon: IconName; label: string }[] = [
    { kind: 'split', icon: 'git-compare-outline', label: t('home.addSplit') },
    { kind: 'income', icon: 'arrow-down', label: t('home.addIncome') },
    { kind: 'expense', icon: 'arrow-up', label: t('home.addExpense') },
  ];
  return (
    <>
      {open ? <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', end: space.lg, bottom, alignItems: 'flex-end', gap: space.md }}>
        {open ? options.map((o) => (
          <Pressable key={o.kind} accessibilityRole="button" accessibilityLabel={o.label} onPress={() => { setOpen(false); onPick(o.kind); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingStart: space.lg, paddingEnd: space.xl, borderRadius: 26, borderCurve: 'continuous', backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.cardEdge, boxShadow: LIFT, opacity: pressed ? 0.85 : 1 })}>
            <Icon name={o.icon} color={colors.accent} />
            <Text variant="label">{o.label}</Text>
          </Pressable>
        )) : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={t('home.addExpense')} onPress={() => setOpen(!open)}
          style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, boxShadow: LIFT, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
          <View style={{ transform: [{ rotate: open ? '45deg' : '0deg' }] }}><Icon name="add" color={colors.onAccent} size={30} /></View>
        </Pressable>
      </View>
    </>
  );
}
