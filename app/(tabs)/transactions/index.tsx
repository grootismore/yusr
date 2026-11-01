import { useMemo } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Money } from '@/components/ui';
import { useCategoryName, useFormatDate } from '@/features/transactions/format';
import { useAccounts, useCategories, usePendingChanges, useTransactions } from '@/features/transactions/hooks';
import { groupByDay, signedAmount } from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const pending = usePendingChanges();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();

  const sections = useMemo(() => groupByDay(transactions), [transactions]);
  const accountNames = useMemo(() => new Map(accounts.all.map((a) => [a.id, a.name])), [accounts.all]);
  const categoryById = useMemo(() => new Map(categories.all.map((c) => [c.id, c])), [categories.all]);

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        pending > 0 ? (
          <Text accessibilityLiveRegion="polite" style={{ padding: 16, fontSize: 13, color: colors.secondaryText }}>
            {t('transactions.syncPending', { count: pending })}
          </Text>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon="swap-horizontal-outline"
          title={t('transactions.emptyTitle')}
          body={t('transactions.emptyBody')}
        />
      }
      renderSectionHeader={({ section }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 }}>
          <Text accessibilityRole="header" style={{ fontSize: 13, color: colors.secondaryText }}>
            {formatDate(section.date)}
          </Text>
          <Money laari={section.net} />
        </View>
      )}
      renderItem={({ item, index, section }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/transaction', params: { id: item.id } })}
          style={({ pressed }) => ({
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.6 : 1,
            borderTopLeftRadius: index === 0 ? 12 : 0,
            borderTopRightRadius: index === 0 ? 12 : 0,
            borderBottomLeftRadius: index === section.data.length - 1 ? 12 : 0,
            borderBottomRightRadius: index === section.data.length - 1 ? 12 : 0,
            marginHorizontal: 16,
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, color: colors.text }}>{categoryName(categoryById.get(item.category_id))}</Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.secondaryText }}>
              {[accountNames.get(item.account_id), item.note].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Money laari={signedAmount(item)} color={item.kind === 'income' ? colors.tint : undefined} />
        </Pressable>
      )}
    />
  );
}
