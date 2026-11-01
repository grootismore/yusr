import { useMemo, useState } from 'react';
import { I18nManager, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Group, HeaderIconButton, Money, Row, Screen } from '@/components/ui';
import { useCategoryName, useMonthLabel } from '@/features/transactions/format';
import { useAccounts, useCategories, useDataReady, useProfile, useTransactions } from '@/features/transactions/hooks';
import { useHijriMonthLabel } from '@/features/giving/format';
import {
  accountBalance,
  categoryBreakdown,
  monthOf,
  monthSummary,
  shiftMonth,
  toISODate,
} from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const monthLabel = useMonthLabel();
  const categoryName = useCategoryName();
  const hijriMonth = useHijriMonthLabel();
  const { privacyMode, hijriAdjustment } = useProfile();
  const ready = useDataReady();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const [month, setMonth] = useState(() => monthOf(toISODate(new Date())));

  const summary = useMemo(() => monthSummary(transactions, month), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month).slice(0, 5), [transactions, month]);
  const byId = useMemo(() => new Map(categories.all.map((c) => [c.id, c])), [categories.all]);

  if (!ready) return <Screen>{null}</Screen>;

  if (accounts.active.length === 0) {
    return (
      <Screen>
        <EmptyState
          title={t('home.noAccountsTitle')}
          body={t('home.noAccountsBody')}
          actionLabel={t('home.addAccount')}
          onAction={() => router.push('/more/account')}
        />
      </Screen>
    );
  }

  // In RTL the "previous" arrow sits on the right and points right.
  const rtl = I18nManager.isRTL;
  const hasActivity = summary.income + summary.expense + summary.giving > 0;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <HeaderIconButton
          icon={rtl ? 'chevron-forward' : 'chevron-back'}
          label={t('home.prevMonth')}
          onPress={() => setMonth(shiftMonth(month, -1))}
        />
        <View style={{ alignItems: 'center' }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
            {monthLabel(month)}
          </Text>
          <Text style={{ fontSize: 13, color: colors.secondaryText }}>
            {[...new Set([hijriMonth(`${month}-01`, hijriAdjustment), hijriMonth(`${month}-28`, hijriAdjustment)])].join(' – ')}
          </Text>
        </View>
        <HeaderIconButton
          icon={rtl ? 'chevron-back' : 'chevron-forward'}
          label={t('home.nextMonth')}
          onPress={() => setMonth(shiftMonth(month, 1))}
        />
      </View>

      <Group title={t('home.thisMonth')}>
        <Row label={t('home.income')} right={<Money laari={summary.income} />} />
        <Row label={t('home.expenses')} right={<Money laari={summary.expense} />} />
        <Row label={t('home.giving')} right={<Money laari={summary.giving} hidden={privacyMode} />} />
        <Row label={t('home.net')} right={<Money laari={summary.net} bold />} />
      </Group>

      <Group title={t('home.whereItWent')}>
        {hasActivity && breakdown.length > 0 ? (
          breakdown.map((item) => (
            <Row
              key={item.categoryId}
              label={`${categoryName(byId.get(item.categoryId))} · ${item.percent}%`}
              right={<Money laari={item.total} hidden={privacyMode && byId.get(item.categoryId)?.kind === 'giving'} />}
            />
          ))
        ) : (
          <Row label={t('home.nothingYet')} />
        )}
      </Group>

      <Group title={t('home.accounts')}>
        {accounts.active.map((account) => (
          <Row
            key={account.id}
            label={account.name}
            right={<Money laari={accountBalance(account, transactions)} />}
            chevron
            onPress={() => router.push({ pathname: '/more/account', params: { id: account.id } })}
          />
        ))}
      </Group>
    </Screen>
  );
}
