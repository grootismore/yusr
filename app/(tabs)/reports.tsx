import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { TrendChart } from '@/components/TrendChart';
import { SharedCard } from '@/features/household/SharedCard';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { LoadError } from '@/components/LoadError';
import { Text } from '@/components/Text';
import { Button, Card, Icon, IconButton, type IconName, ProgressBar, Row, Screen, ScreenTitle, Tile } from '@/components/ui';
import * as api from '@/data/api';
import { useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, useIncome, useRates, useTrend, useWrite } from '@/data/hooks';
import { debtMonth } from '@/features/debts/report';
import { averageSpend, lastMonths } from '@/features/trends/trend';
import { budgetState, percentUsed } from '@/lib/budget';
import { addDays, addMonths, formatDate, monthStart, today } from '@/lib/dates';
import { ltr } from '@/lib/money';
import { useMoneyText } from '@/lib/privacy';
import { radius, space, useColors } from '@/theme/tokens';
import { toast } from '@/lib/toast';

export default function Reports() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const money = useMoneyText();
  const router = useRouter();
  const catName = useCategoryName();
  const [month, setMonth] = useState(monthStart());
  const expensesQuery = useExpenses(month);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const limits = useBudgets(month).data;
  const categoriesQuery = useCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const total = expenses.reduce((s, e) => s + e.mvr_laari, 0);
  const rows = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.mvr_laari);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [expenses]);
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
  const incomeTotal = incomeRows.reduce((s, i) => s + i.mvr_laari, 0);
  const dm = useMemo(() => debtMonth(debtsData ?? [], debtPaymentsData ?? [], month.slice(0, 7), rates ?? {}), [debtsData, debtPaymentsData, month, rates]);
  const removeIncome = useWrite(api.deleteIncome);
  const mixedPay = incomeRows.some((i) => i.currency !== 'MVR'); // pay arrived in more than one currency
  const trendMonths = useMemo(() => lastMonths(monthStart(), 6), []);
  const trend = useTrend(trendMonths).data;
  const overall = limits?.get(null);
  const overallState = budgetState(total, overall);
  const rtl = i18n.language === 'dv';

  return (
    <Screen tabbed>
      <ScreenTitle title={t('reports.title')} />
      {expensesQuery.isError && !expensesQuery.data ? <LoadError onRetry={() => void expensesQuery.refetch()} busy={expensesQuery.isFetching} /> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon={rtl ? 'chevron-forward' : 'chevron-back'} label={t('reports.prev')} onPress={() => setMonth(addMonths(month, -1))} />
        <View style={{ paddingVertical: space.sm, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: colors.accentWash }}>
          <Text variant="label" accessibilityLiveRegion="polite">{(t('months', { returnObjects: true }) as string[])[Number(month.slice(5, 7)) - 1]} <Text latin variant="label">{month.slice(0, 4)}</Text></Text>
        </View>
        <IconButton icon={rtl ? 'chevron-back' : 'chevron-forward'} label={t('reports.next')} disabled={month >= monthStart()} onPress={() => setMonth(addMonths(month, 1))} />
      </Row>

      <Card tone="hero" style={{ gap: space.md, padding: space.xl }}>
        <Text color={colors.onHero}>{t('reports.total')}</Text>
        <Money laari={total} variant="display" color={colors.onHero} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 40, lineHeight: 52 }} />
        {overall ? (
          <>
            <ProgressBar onHero percent={percentUsed(total, overall)} state={overallState === 'none' ? 'ok' : overallState} label={t('a11y.progress', { percent: percentUsed(total, overall) })} />
            {overallState === 'over' || overallState === 'near' ? (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: overallState === 'over' ? colors.coralWash : colors.amberWash }}>
                <Icon name={overallState === 'over' ? 'alert-circle' : 'warning'} size={18} color={overallState === 'over' ? colors.coral : colors.amberDeep} />
                {overallState === 'over'
                  ? <Msg k="reports.overBy" amounts={{ amount: total - overall }} variant="small" color={colors.coral} />
                  : <Text variant="small" color={colors.ink}>{t('reports.nearLimit')}</Text>}
              </View>
            ) : null}
            {overallState === 'over' ? null : <Msg k="reports.leftOf" amounts={{ amount: overall - total, limit: overall }} color={colors.onHero} />}
          </>
        ) : null}
      </Card>

      <SharedCard month={month} withActions={false} />

      {incomeTotal > 0 ? (
        <Row style={{ alignItems: 'stretch', gap: space.md }}>
          <Tile color={colors.tile} label={t('reports.income')} laari={incomeTotal} />
          <Tile color={colors.sky} label={t('reports.netShort')} laari={incomeTotal - total - dm.byYou} />
        </Row>
      ) : null}

      {dm.open > 0 || dm.byYou + dm.fromSalary > 0 ? (
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
                  onPress={() => Alert.alert(t('income.deleteTitle'), undefined, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.remove'), style: 'destructive', onPress: () => removeIncome.mutate(i.id, { onSuccess: () => toast(t('toast.deleted')) }) }])} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {expenses.length === 0 ? <Text color={colors.inkMuted}>{t('reports.empty')}</Text> : (
        <>
          <Text variant="heading">{t('reports.byCategory')}</Text>
          <Card>
            {rows.map(([id, amount]) => {
              const c = id ? byId.get(id) : undefined;
              const limit = id ? limits?.get(id) : undefined;
              const st = budgetState(amount, limit);
              return (
                <View key={id ?? 'none'} style={{ gap: space.xs }}>
                  <Row>
                    <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}><Icon name={(c?.icon ?? 'ellipsis') as IconName} color={colors.accent} /></View>
                    <Text style={{ flex: 1 }}>{catName(c)}</Text>
                    <Money laari={amount} />
                  </Row>
                  <ProgressBar percent={limit ? percentUsed(amount, limit) : percentUsed(amount, Math.max(total, 1))} state={st === 'none' ? 'ok' : st} label={catName(c)} />
                  {limit ? (
                    <>
                    <Row>
                      {st !== 'ok' ? <Icon name={st === 'over' ? 'alert-circle' : 'warning'} size={18} color={st === 'over' ? colors.coral : colors.amberDeep} /> : null}
                      {st === 'over'
                        ? <Msg k="reports.overBy" amounts={{ amount: amount - limit }} variant="small" color={colors.coral} style={{ flex: 1 }} />
                        : <Msg k="reports.leftOf" amounts={{ amount: limit - amount, limit }} variant="small" color={colors.inkMuted} style={{ flex: 1 }} />}
                    </Row>
                    {st === 'near' ? <Text variant="small">{t('reports.nearLimit')}</Text> : null}
                    </>
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
