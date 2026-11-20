import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCategoryName, useHousehold } from '@/data/hooks';
import type { Category } from '@/data/types';
import { nameOf, type HouseholdEntry } from '@/features/household/logic';
import { formatDate } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';
import { Money } from './Money';
import { Text } from './Text';
import { Icon, type IconName } from './ui';

/** One entry from the shared pot, in the same shape as your own rows, with who paid or received it. */
export function SharedRow({ entry, category, hideDate }: { entry: HouseholdEntry; category?: Category; hideDate?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const catName = useCategoryName();
  const members = useHousehold().data?.members ?? [];
  const income = entry.kind === 'income';
  const title = entry.merchant || (income ? entry.note : null) || (category ? catName(category) : t(`household.kind.${entry.kind}`));
  const who = nameOf(members, entry.user_id) || t('household.former');
  return (
    <Pressable accessibilityRole="button" accessibilityHint={t('edit.tapToEdit')} accessibilityLabel={`${title}, ${who}, ${formatDate(entry.entry_date)}`}
      onPress={() => router.push({ pathname: '/household-entry', params: { id: entry.id, month: entry.entry_date.slice(0, 7) } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={(income ? 'arrow-down' : category?.icon ?? 'ellipsis') as IconName} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1}>{title}</Text>
        <Text variant="small" color={colors.inkMuted} numberOfLines={1}>
          {t('household.sharedBy', { name: who })}{hideDate ? '' : ' · '}{hideDate ? null : <Text latin variant="small" color={colors.inkMuted}>{formatDate(entry.entry_date)}</Text>}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Money laari={entry.mvr_laari} prefix={income ? '+' : '−'} color={income ? colors.accent : undefined} />
        {entry.currency !== 'MVR' ? <Money laari={entry.amount_laari} currency={entry.currency} variant="small" color={colors.inkMuted} /> : null}
      </View>
    </Pressable>
  );
}
