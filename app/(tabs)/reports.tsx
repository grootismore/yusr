import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { confirmDialog } from '@/lib/dialog';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { TrendChart } from '@/components/TrendChart';
import { historyNeedsPlus } from '@/features/plus/limits';
import { SharedCard } from '@/features/household/SharedCard';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { LoadError } from '@/components/LoadError';
import { Text } from '@/components/Text';
import { Button, Card, Icon, IconButton, ProgressBar, Row, Screen, ScreenTitle, Tile } from '@/components/ui';
import * as api from '@/data/api';
import { useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, useIncome, usePlan, useRates, useSharedTotals, useTrend, useWrite } from '@/data/hooks';
import { debtMonth } from '@/features/debts/report';
import { averageSpend, lastMonths } from '@/features/trends/trend';
import { budgetState, percentUsed } from '@/lib/budget';
import { addDays, addMonths, formatDate, monthStart, today } from '@/lib/dates';
import { useFeature } from '@/features/features/hooks';
import { useRule } from '@/features/rule/hooks';
import { RuleCard } from '@/features/rule/ui';
import { ltr } from '@/lib/money';
import { useMoneyText } from '@/lib/privacy';
import { radius, series, space, useColors, useIsDark } from '@/theme/tokens';
import { DonutChart } from '@/components/DonutChart';
import { sliceShares } from '@/features/trends/chart';
import { toast } from '@/lib/toast';

export default function Reports() {
  const colors = useColors();
  const { t } = useTranslation();
  const money = useMoneyText();
  const router = useRouter();
  const catName = useCategoryName();
  const [month, setMonth] = useState(monthStart());
  const plus = usePlan().data?.plus ?? false;
  const expensesQuery = useExpenses(month);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const limits = useBudgets(month).data;
  const categoriesQuery = useCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const shared = useSharedTotals(month);
  const rule = useRule(month);
  const featDebts = useFeature('debts'), featHousehold = useFeature('household');
  // In a couple or household, the whole shared pot counts alongside your own.
  const total = expenses.reduce((s, e) => s + e.mvr_laari, 0) + shared.spent;
  const rows = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.mvr_laari);
    for (const [id, v] of shared.byCategory) m.set(id, (m.get(id) ?? 0) + v);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [expenses, shared]);
  const slices = useMemo(() => sliceShares(rows), [rows]);
  const palette = useIsDark() ? series.dark : series.light;
  const days = useMemo(() => {
    const g = new Map<string, typeof expenses>();
    for (const e of expenses) g.set(e.spent_at, [...(g.get(e.spent_at) ?? []), e]);
    return [...g].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [expenses]);
  const debtsData = useDebts().data;
  const debtPaymentsData = useDebtPayments().data;
  const rates = useRates().data;
  const incomeQ = useIncome(month);
  const incomeRows = useMemo(() => incomeQ.data ?? [], [incomeQ.data]);
  const incomeTotal = incomeRows.reduce((s, i) => s + i.mvr_laari, 0) + shared.income;
  const dm = useMemo(() => debtMonth(debtsData ?? [], debtPaymentsData ?? [], month.slice(0, 7), rates ?? {}), [debtsData, debtPaymentsData, month, rates]);
  const removeIncome = useWrite(api.deleteIncome);
  const mixedPay = incomeRows.some((i) => i.currency !== 'MVR'); // pay arrived in more than one currency
  const trendMonths = useMemo(() => lastMonths(monthStart(), 6), []);
  const trend = useTrend(trendMonths).data;
  const overall = limits?.get(null);
  const overallState = budgetState(total, overall);

  return (
    <Screen tabbed>
      <ScreenTitle title={t('reports.title')} />
      {expensesQuery.isError && !expensesQuery.data ? <LoadError onRetry={() => void expensesQuery.refetch()} busy={expensesQuery.isFetching} /> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon={'chevron-back'} label={t('reports.prev')} onPress={() => (historyNeedsPlus(addMonths(month, -1), monthStart(), plus) ? router.push({ pathname: '/plus', params: { reason: 'history' } }) : setMonth(addMonths(month, -1)))} />
        <View style={{ paddingVertical: space.sm, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: colors.accentWash }}>
          <Text variant="label" accessibilityLiveRegion="polite">{(t('months', { returnObjects: true }) as string[])[Number(month.slice(5, 7)) - 1]} <Text latin variant="label">{month.slice(0, 4)}</Text></Text>
        </View>
        <IconButton icon={'chevron-forward'} label={t('reports.next')} disabled={month >= monthStart()} onPress={() => setMonth(addMonths(month, 1))} />
      </Row>

      <Card tone="hero" style={{ gap: space.md, padding: space.xl }}>
        <Text color={colors.onHero}>{t('reports.total')}</Text>
        <Money laari={total} variant="display" color={colors.onHero} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 40, lineHeight: 52 }} />
        {shared.spent > 0 ? <Msg k="household.includesShared" amounts={{ amount: shared.spent }} variant="small" color={colors.onHero} /> : null}
        {overall ? (
          <>
            <ProgressBar onHero percent={percentUsed(total, overall)} state={overallState === 'none' ? 'ok' : overallState} label={t('a11y.progress', { percent: percentUsed(total, overall) })} />
            {overallState === 'over' || overallState === 'near' ? (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name={overallState === 'over' ? 'information-circle' : 'warning'} size={18} color={overallState === 'over' ? '#FF8A7A' : colors.amber} />
                {overallState === 'over'
                  ? <Msg k="home.overNext" amounts={{ amount: total - overall }} variant="small" color={colors.onHero} style={{ flexShrink: 1 }} />
                  : <Text variant="small" color={colors.onHero}>{t('reports.nearLimit')}</Text>}
              </View>
            ) : null}
            {overallState === 'over' ? null : <Msg k="reports.leftOf" amounts={{ amount: overall - total, limit: overall }} color={colors.onHero} />}
          </>
        ) : null}
      </Card>

      {featHousehold ? <SharedCard month={month} withActions={false} /> : null}

      {incomeTotal > 0 ? (
        <Row style={{ alignItems: 'stretch', gap: space.md }}>
          <Tile color={colors.tile} label={t('reports.income')} laari={incomeTotal} onPress={() => router.push({ pathname: '/income', params: { month } })} />
          <Tile color={colors.sky} label={t('reports.netShort')} laari={incomeTotal - total - dm.byYou} />
        </Row>
      ) : null}

      <RuleCard lines={rule.lines} income={rule.income} debtPaid={rule.debtPaid} />

      {featDebts && (dm.open > 0 || dm.byYou + dm.fromSalary > 0) ? (
        <>
          <Text variant="heading">{t('reports.debtsTitle')}</Text>
          <Card>
            <Row><Text style={{ flex: 1 }}>{t('reports.debtPaidByYou')}</Text><Money laari={dm.byYou} /></Row>
            {dm.fromSalary > 0 ? (
              <View style={{ gap: 2 }}>
                <Row><Text style={{ flex: 1 }}>{t('reports.debtFromSalary')}</Text><Money laari={dm.fromSalary} /></Row>
                <Text variant="small" color={colors.inkMuted}>{t('reports.debtFromSalaryNote')}</Text>
              </View>
            ) : null}
            <Row><Text style={{ flex: 1 }}>{t('reports.debtOwed')}</Text><Money laari={dm.owed} /></Row>
            <Button kind="secondary" label={t('more.debts')} icon="leaf-outline" onPress={() => router.push('/debts')} />
          </Card>
        </>
      ) : null}

      {trend ? (
        <>
          <Text variant="heading">{t('trend.title')}</Text>
          <Card>
            <TrendChart months={trendMonths} spend={trend.spend} income={trend.income} selected={month} onSelect={setMonth} />
            {averageSpend(trend.spend) > 0 ? <Msg k="trend.average" amounts={{ amount: averageSpend(trend.spend) }} variant="small" color={colors.inkMuted} /> : null}
          </Card>
        </>
      ) : null}

      {incomeRows.length > 0 ? (
        <>
          <Text variant="heading">{t('reports.incomeList')}</Text>
          <Card>
            {incomeRows.map((i) => (
              <Row key={i.id} style={{ minHeight: 56 }}>
                <Pressable accessibilityRole="button" accessibilityHint={t('edit.tapToEdit')} onPress={() => router.push({ pathname: '/edit-income', params: { id: i.id } })}
                  style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? 0.6 : 1 })}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1}>{i.note || t('reports.income')}</Text>
                    <Text latin variant="small" color={colors.inkMuted}>{formatDate(i.received_at)}</Text>
                    {mixedPay ? (
                      <Text variant="small" color={colors.inkMuted}>
                        {i.currency === 'MVR' ? t('reports.paidIn', { currency: 'MVR' }) : t('reports.paidInRate', { amount: money(i.amount_laari, i.currency), rate: ltr((i.mvr_laari / i.amount_laari).toFixed(2)) })}
                      </Text>
                    ) : null}
                  </View>
                  <Money laari={i.mvr_laari} />
                </Pressable>
                <IconButton icon="trash-outline" label={t('common.remove')}
                  onPress={async () => { if (await confirmDialog({ title: t('income.deleteTitle'), confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), destructive: true })) removeIncome.mutate(i.id, { onSuccess: () => toast(t('toast.deleted')) }); }} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {rows.length === 0 ? <Text color={colors.inkMuted}>{t('reports.empty')}</Text> : (
        <>
          <Text variant="heading">{t('reports.byCategory')}</Text>
          <Card>
            <DonutChart values={slices.map((x) => x.value)} colors={slices.map((_, i) => palette[i % palette.length])} label={`${t('reports.byCategory')}: ${money(total)}`}>
              <Text variant="small" color={colors.inkMuted}>{t('reports.total')}</Text>
              <Money laari={total} variant="heading" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 16, lineHeight: 22 }} />
            </DonutChart>
            {slices.map((sl, i) => {
              const c = sl.key !== 'other' && sl.key ? byId.get(sl.key) : undefined;
              const limit = sl.key !== 'other' && sl.key ? limits?.get(sl.key) : undefined;
              const st = budgetState(sl.value, limit);
              return (
                <View key={String(sl.key)} style={{ gap: 2 }}>
                  <Row style={{ minHeight: 40 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: palette[i % palette.length] }} />
                    <Text style={{ flex: 1 }} numberOfLines={1}>{sl.key === 'other' ? t('reports.other') : catName(c)}</Text>
                    <Text latin variant="small" color={colors.inkMuted}>{sl.percent}%</Text>
                    <Money laari={sl.value} />
                  </Row>
                  {limit ? (
                    <Row>
                      {st !== 'ok' ? <Icon name={st === 'over' ? 'alert-circle' : 'warning'} size={18} color={st === 'over' ? colors.coral : colors.amberDeep} /> : null}
                      {st === 'over'
                        ? <Msg k="reports.overBy" amounts={{ amount: sl.value - limit }} variant="small" color={colors.coral} style={{ flex: 1 }} />
                        : <Msg k="reports.leftOf" amounts={{ amount: limit - sl.value, limit }} variant="small" color={colors.inkMuted} style={{ flex: 1 }} />}
                    </Row>
                  ) : null}
                </View>
              );
            })}
          </Card>
          {days.map(([day, list]) => (
            <View key={day} style={{ gap: space.sm }}>
              <Text variant="label" color={colors.inkMuted}>{day === today() ? t('common.today') : day === addDays(today(), -1) ? t('common.yesterday') : <Text latin variant="label" color={colors.inkMuted}>{formatDate(day)}</Text>}</Text>
              <Card>{list.map((e) => <ExpenseRow key={e.id} hideDate expense={e} category={e.category_id ? byId.get(e.category_id) : undefined} />)}</Card>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
