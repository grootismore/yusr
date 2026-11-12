import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { EmptyState, Money, ScreenTitle } from '@/components/ui';
import { useCategoryName, useFormatDate } from '@/features/transactions/format';
import { useAccounts, useCategories, usePendingChanges, useProfile, useDeleteTransactionWithUndo, useRefresh, useTransactions } from '@/features/transactions/hooks';
import { useFormatHijri } from '@/features/giving/format';
import { filterTransactions, groupByDay, signedAmount } from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const formatHijri = useFormatHijri();
  const { privacyMode, hijriAdjustment } = useProfile();
  const pending = usePendingChanges();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const refresh = useRefresh();
  const removeWithUndo = useDeleteTransactionWithUndo();
  // Swipe or pull to delete: no question, Undo is offered instead.
  const askDelete = (id: string) => {
    const row = transactions.find((x) => x.id === id);
    if (row) removeWithUndo(row);
  };

  const [query, setQuery] = useState('');
  const accountNames = useMemo(() => new Map(accounts.all.map((a) => [a.id, a.name])), [accounts.all]);
  const categoryById = useMemo(() => new Map(categories.all.map((c) => [c.id, c])), [categories.all]);
  const shown = useMemo(
    () =>
      filterTransactions(transactions, query, {
        categoryName: (x) => categoryName(categoryById.get(x.category_id)),
        accountName: (x) => accountNames.get(x.account_id) ?? '',
        hidden: (x) => privacyMode && x.kind === 'giving',
      }),
    [transactions, query, categoryName, categoryById, accountNames, privacyMode],
  );
  const sections = useMemo(() => groupByDay(shown), [shown]);

  return (
    <>
      {/* The native iOS search bar in the large-title header. */}
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: t('transactions.search'),
            autoCapitalize: 'none',
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            onCancelButtonPress: () => setQuery(''),
          },
        }}
      />
      <SectionList
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      refreshing={refresh.refreshing}
      onRefresh={refresh.onRefresh}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <>
          <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
            <ScreenTitle>{t('tabs.transactions')}</ScreenTitle>
          </View>
          {pending > 0 ? (
            <Text accessibilityLiveRegion="polite" style={{ padding: 16, fontSize: 13, color: colors.secondaryText }}>
              {t('transactions.syncPending', { count: pending })}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        query.trim() !== '' ? (
          <EmptyState icon="swap-horizontal-outline" title={t('transactions.noMatchesTitle')} body={t('transactions.noMatchesBody')} />
        ) : (
          <EmptyState icon="swap-horizontal-outline" title={t('transactions.emptyTitle')} body={t('transactions.emptyBody')} />
        )
      }
      renderSectionHeader={({ section }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 }}>
          <Text accessibilityRole="header" style={{ fontSize: 13, color: colors.secondaryText, flexShrink: 1 }}>
            {`${formatDate(section.date)} · ${formatHijri(section.date, hijriAdjustment)}`}
          </Text>
          <Money laari={section.net} hidden={privacyMode && section.data.some((x) => x.kind === 'giving')} />
        </View>
      )}
      renderItem={({ item, index, section }) => (
        <SwipeToDelete
          label={t('common.delete')}
          onDelete={() => askDelete(item.id)}
          style={{
            marginHorizontal: 16,
            borderTopLeftRadius: index === 0 ? 16 : 0,
            borderTopRightRadius: index === 0 ? 16 : 0,
            borderBottomLeftRadius: index === section.data.length - 1 ? 16 : 0,
            borderBottomRightRadius: index === section.data.length - 1 ? 16 : 0,
          }}
        >
        <Pressable
          accessibilityRole="button"
          accessibilityActions={[{ name: 'delete', label: t('common.delete') }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete') askDelete(item.id);
          }}
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
            borderBottomWidth: index === section.data.length - 1 ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.separator,
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, color: colors.text }}>{categoryName(categoryById.get(item.category_id))}</Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.secondaryText }}>
              {[accountNames.get(item.account_id), privacyMode && item.kind === 'giving' ? null : item.note].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Money laari={signedAmount(item)} color={item.kind === 'income' ? colors.tint : undefined} hidden={privacyMode && item.kind === 'giving'} />
        </Pressable>
        </SwipeToDelete>
      )}
    />
    </>
  );
}
