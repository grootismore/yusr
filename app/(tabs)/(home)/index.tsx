import { useMemo, useState } from 'react';
import { I18nManager, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DeletionBanner } from '@/features/account/DeletionBanner';
import { EmptyState, Group, HeaderIconButton, Money, Row, Screen } from '@/components/ui';
import { planInput } from '@/features/debts/logic';
import { planDebts } from '@/features/debts/plan';
import { usePlanSettings } from '@/features/debts/settings';
import { useHijriMonthLabel } from '@/features/giving/format';
import { safeToSpend, upcomingItems, type UpcomingItem } from '@/features/transactions/budget';
import { useCategoryName, useFormatDate, useMonthLabel } from '@/features/transactions/format';
import {
  useAccounts,
  useCategories,
  useCommitments,
  useDataReady,
  useDebts,
  useProfile,
  useRecurringItems,
  useTransactions,
} from '@/features/transactions/hooks';
import { accountBalance, categoryBreakdown, monthOf, monthSummary, shiftMonth, toISODate } from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const monthLabel = useMonthLabel();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const hijriMonth = useHijriMonthLabel();
  const { privacyMode, hijriAdjustment } = useProfile();
  const ready = useDataReady();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const debts = useDebts().active;
  const commitments = useCommitments().active;
  const recurring = useRecurringItems().active;
  const [plan] = usePlanSettings();
  const today = toISODate(new Date());
  const [month, setMonth] = useState(() => monthOf(today));

  const summary = useMemo(() => monthSummary(transactions, month), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month).slice(0, 5), [transactions, month]);
  const byId = useMemo(() => new Map(categories.all.map((c) => [c.id, c])), [categories.all]);
  const safe = useMemo(
    () => safeToSpend({ today, transactions, debts, commitments, recurring, hijriAdjustment }),
    [today, transactions, debts, commitments, recurring, hijriAdjustment],
  );
  const upcoming = useMemo(
    () => upcomingItems({ today, days: 7, transactions, debts, commitments, recurring, hijriAdjustment }),
    [today, transactions, debts, commitments, recurring, hijriAdjustment],
  );
  const debtFree = useMemo(
    () => planDebts(planInput(debts, transactions), plan.strategy, plan.monthlyLaari, monthOf(today)),
    [debts, transactions, plan.strategy, plan.monthlyLaari, today],
  );

  if (!ready) return <Screen>{null}</Screen>;

  if (accounts.active.length === 0) {
    return (
      <Screen>
        <DeletionBanner />
        <EmptyState
          title={t('home.noAccountsTitle')}
          body={t('home.noAccountsBody')}
          actionLabel={t('home.addAccount')}
          onAction={() => router.push('/more/account')}
        />
      </Screen>
    );
  }

  const rtl = I18nManager.isRTL; // in RTL the "previous" arrow sits on the right and points right
  const hasActivity = summary.income + summary.expense + summary.giving > 0;
  const outgoing = Math.max(summary.income, summary.expense, 1);
  const labelFor = (item: UpcomingItem) =>
    item.kind === 'giving' ? t(`giving.types.${commitments.find((c) => c.id === item.id)?.type ?? 'sadaqah'}`) : item.label;
  const open = (item: UpcomingItem) =>
    router.push({
      pathname: '/transaction',
      params: item.kind === 'debt' ? { debtId: item.id } : item.kind === 'giving' ? { commitmentId: item.id } : { recurringId: item.id },
    });
  const note = { fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 } as const;
  const setAside = [
    ['home.setAsideDebts', safe.reservedDebts, false],
    ['home.setAsideGiving', safe.reservedGiving, true],
    ['home.setAsideBills', safe.reservedBills, false],
  ] as const;

  return (
    <Screen>
      <DeletionBanner />
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

      {month === monthOf(today) ? (
        <>
          <Group title={t('home.safeToSpend')}>
            <Row label={t('home.safeToSpend')} right={<Money laari={safe.safeToSpend} bold />} />
            {setAside
              .filter(([, amount]) => amount > 0)
              .map(([key, amount, isGiving]) => (
                <Row key={key} label={t(key)} right={<Money laari={amount} hidden={privacyMode && isGiving} />} />
              ))}
          </Group>
          <Text style={note}>{t('home.safeHint')}</Text>

          <Group title={t('home.upcoming')}>
            {upcoming.length === 0 ? (
              <Row label={t('home.upcomingEmpty')} />
            ) : (
              upcoming.map((item) => (
                <Row
                  key={`${item.kind}-${item.id}-${item.dueOn}`}
                  label={item.overdue ? t('home.overdue', { label: labelFor(item), date: formatDate(item.dueOn) }) : `${labelFor(item)} · ${formatDate(item.dueOn)}`}
                  destructive={item.overdue}
                  right={<Money laari={item.amount} hidden={privacyMode && item.kind === 'giving'} />}
                  chevron
                  onPress={() => open(item)}
                />
              ))
            )}
            {debtFree.debtFreeMonth ? <Row label={t('home.debtFree')} value={monthLabel(debtFree.debtFreeMonth)} /> : null}
          </Group>
        </>
      ) : null}

      <Group title={t('home.thisMonth')}>
        <Row label={t('home.income')} right={<Money laari={summary.income} />} />
        <Row label={t('home.expenses')} right={<Money laari={summary.expense} />} />
        <Row label={t('home.giving')} right={<Money laari={summary.giving} hidden={privacyMode} />} />
        <Row label={t('home.net')} right={<Money laari={summary.net} bold />} />
      </Group>
      {/* Income against expenses (giving left out, so private mode cannot be undone from the bar). */}
      <View
        accessible
        accessibilityLabel={`${t('home.income')} ${summary.income / 100}, ${t('home.expenses')} ${summary.expense / 100}`}
        style={{ gap: 6, paddingHorizontal: 16 }}
      >
        {([['home.income', summary.income, colors.tint], ['home.expenses', summary.expense, colors.secondaryText]] as const).map(([key, value, color]) => (
          <View key={key} style={{ height: 8, borderRadius: 4, backgroundColor: colors.separator, overflow: 'hidden' }}>
            <View style={{ height: 8, width: `${Math.round((value * 100) / outgoing)}%`, backgroundColor: color }} />
          </View>
        ))}
      </View>

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
