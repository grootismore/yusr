import { useMemo, useState } from 'react';
import { I18nManager, View } from 'react-native';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DeletionBanner } from '@/features/account/DeletionBanner';
import { DEPTH, DepthCard } from '@/components/DepthCard';
import { Button, EmptyState, Group, HeaderIconButton, Money, Row, Screen } from '@/components/ui';
import { planInput } from '@/features/debts/logic';
import { planDebts } from '@/features/debts/plan';
import { usePlanSettings } from '@/features/debts/settings';
import { useHijriRange } from '@/features/giving/format';
import { safeToSpend, upcomingItems, waterColumn, type UpcomingItem } from '@/features/transactions/budget';
import { useCategoryName, useFormatDate, useMonthLabel } from '@/features/transactions/format';
import {
  useAccounts,
  useAddCashAccount,
  useCategories,
  useCommitments,
  useDataReady,
  useDebts,
  useProfile,
  useRecurringItems,
  useRefresh,
  useTransactions,
} from '@/features/transactions/hooks';
import { accountBalance, categoryBreakdown, monthOf, monthSummary, shiftMonth, toISODate } from '@/features/transactions/logic';
import { formatMVR } from '@/lib/money';
import { MonthReview } from '@/features/transactions/MonthReview';
import { GettingStarted } from '@/features/onboarding/GettingStarted';
import { useColors } from '@/lib/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const monthLabel = useMonthLabel();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const hijriRange = useHijriRange();
  const { privacyMode, hijriAdjustment } = useProfile();
  const ready = useDataReady();
  const refresh = useRefresh();
  const accounts = useAccounts();
  const addCash = useAddCashAccount();
  const categories = useCategories();
  const transactions = useTransactions();
  const debts = useDebts().active;
  const commitments = useCommitments().active;
  const recurring = useRecurringItems().active;
  const [plan] = usePlanSettings();
  const today = toISODate(new Date());
  const [month, setMonth] = useState(() => monthOf(today));
  const [showWhere, setShowWhere] = useState(false);
  const [showWorking, setShowWorking] = useState(false);

  const summary = useMemo(() => monthSummary(transactions, month), [transactions, month]);
  const breakdown = useMemo(() => categoryBreakdown(transactions, month).slice(0, 5), [transactions, month]);
  const byId = useMemo(() => new Map(categories.all.map((c) => [c.id, c])), [categories.all]);
  const safe = useMemo(
    () => safeToSpend({ today, transactions, debts, commitments, recurring, hijriAdjustment }),
    [today, transactions, debts, commitments, recurring, hijriAdjustment],
  );
  const column = useMemo(() => waterColumn(safe, privacyMode), [safe, privacyMode]);
  const upcoming = useMemo(
    () => upcomingItems({ today, days: 7, transactions, debts, commitments, recurring, hijriAdjustment }),
    [today, transactions, debts, commitments, recurring, hijriAdjustment],
  );
  const debtFree = useMemo(
    () => planDebts(planInput(debts, transactions), plan.strategy, plan.monthlyLaari, monthOf(today)),
    [debts, transactions, plan.strategy, plan.monthlyLaari, today],
  );

  if (!ready) return <Screen title={t('tabs.home')}>{null}</Screen>;

  if (accounts.active.length === 0) {
    return (
      <Screen title={t('tabs.home')} refresh={refresh}>
        <DeletionBanner />
        <EmptyState
          title={t('home.noAccountsTitle')}
          body={t('home.noAccountsBody')}
          actionLabel={t('accounts.useCash')}
          onAction={addCash}
        />
        <Button title={t('home.addAccount')} variant="secondary" onPress={() => router.push('/more/account')} />
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

  return (
    <Screen title={t('tabs.home')} refresh={refresh}>
      <DeletionBanner />
      <MonthReview today={today} transactions={transactions} privacyMode={privacyMode} />
      <GettingStarted done={{ transaction: transactions.length > 0, debt: debts.length > 0, plan: commitments.length > 0 }} />
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
            {hijriRange(`${month}-01`, `${month}-28`, hijriAdjustment)}
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
          <DepthCard
            lead={t('home.safeLead')}
            amount={Math.max(safe.safeToSpend, 0)}
            note={column.shortBy > 0 ? t('home.shortBy', { amount: formatMVR(column.shortBy) }) : undefined}
            parts={column.parts.map((part) => ({
              key: part.key,
              laari: part.laari,
              color: DEPTH[part.key],
              label: t(`home.column.${part.key}`),
              // Private mode hides what has been spent and set aside, which includes giving.
              hidden: part.key === 'used',
              legend: part.key !== 'safe',
            }))}
            accessibilityLabel={[
              `${t('home.safeLead')} ${formatMVR(Math.max(safe.safeToSpend, 0))}`,
              column.shortBy > 0 ? t('home.shortBy', { amount: formatMVR(column.shortBy) }) : '',
              ...column.parts
                .filter((part) => part.key !== 'safe')
                .map((part) => `${t(`home.column.${part.key}`)} ${part.key === 'used' ? t('common.hidden') : formatMVR(part.laari)}`),
            ]
              .filter(Boolean)
              .join('. ')}
          />
          <Text style={note}>{t('home.safeHint')}</Text>
          {/* The sum behind the big number, one tap away, so nobody has to guess where it comes from. */}
          <Group>
            <Row label={t('home.howTitle')} chevron expanded={showWorking} onPress={() => setShowWorking(!showWorking)} accessibilityHint={showWorking ? undefined : t('home.safeHint')} />
            {showWorking ? (
              <>
                <Row label={t('home.howIncome')} right={<Money laari={safe.income} />} />
                <Row label={t('home.howSpent')} right={<Money laari={safe.spent} hidden={privacyMode} />} />
                <Row label={t('home.howDebts')} right={<Money laari={safe.reservedDebts} />} />
                <Row label={t('home.howGiving')} right={<Money laari={safe.reservedGiving} hidden={privacyMode} />} />
                <Row label={t('home.howBills')} right={<Money laari={safe.reservedBills} />} />
                <Row label={t('home.safeLead')} right={<Money laari={Math.max(safe.safeToSpend, 0)} bold />} />
              </>
            ) : null}
          </Group>

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
        {([['home.income', summary.income, colors.positive], ['home.expenses', summary.expense, colors.secondaryText]] as const).map(([key, value, color]) => (
          <View key={key} style={{ height: 8, borderRadius: 4, backgroundColor: colors.separator, overflow: 'hidden' }}>
            <View style={{ height: 8, width: `${Math.round((value * 100) / outgoing)}%`, backgroundColor: color }} />
          </View>
        ))}
      </View>

      {/* Closed until asked for, so the first screen is the number, what is coming and the balances. */}
      {hasActivity && breakdown.length > 0 ? (
        <Group>
          <Row
            label={t('home.whereItWent')}
            chevron
            onPress={() => setShowWhere(!showWhere)}
            expanded={showWhere}
          />
          {showWhere
            ? breakdown.map((item) => (
                <Row
                  key={item.categoryId}
                  label={`${categoryName(byId.get(item.categoryId))} · ${item.percent}%`}
                  right={<Money laari={item.total} hidden={privacyMode && byId.get(item.categoryId)?.kind === 'giving'} />}
                />
              ))
            : null}
        </Group>
      ) : (
        <Group title={t('home.whereItWent')}>
          <Row label={t('home.nothingYet')} />
        </Group>
      )}

    </Screen>
  );
}
