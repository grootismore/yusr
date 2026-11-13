import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { TrendChart } from '@/components/TrendChart';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Card, Icon, IconButton, type IconName, ProgressBar, Row, Screen, ScreenTitle } from '@/components/ui';
import * as api from '@/data/api';
import { useBudgets, useCategories, useCategoryName, useExpenses, useIncome, useTrend, useWrite } from '@/data/hooks';
import { averageSpend, lastMonths } from '@/features/trends/trend';
import { budgetState, percentUsed } from '@/lib/budget';
import { addMonths, formatDate, monthStart } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';

export default function Reports() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
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
  const incomeQ = useIncome(month);
  const incomeRows = useMemo(() => incomeQ.data ?? [], [incomeQ.data]);
  const incomeTotal = incomeRows.reduce((s, i) => s + i.mvr_laari, 0);
  const removeIncome = useWrite(api.deleteIncome);
  const trendMonths = useMemo(() => lastMonths(monthStart(), 6), []);
  const trend = useTrend(trendMonths).data;
  const overall = limits?.get(null);
  const overallState = budgetState(total, overall);
  const rtl = i18n.language === 'dv';

  return (
    <Screen tabbed>
      <ScreenTitle title={t('reports.title')} />
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon={rtl ? 'chevron-forward' : 'chevron-back'} label={t('reports.prev')} onPress={() => setMonth(addMonths(month, -1))} />
        <Text variant="heading" accessibilityLiveRegion="polite">{(t('months', { returnObjects: true }) as string[])[Number(month.slice(5, 7)) - 1]} <Text latin variant="heading">{month.slice(0, 4)}</Text></Text>
        <IconButton icon={rtl ? 'chevron-back' : 'chevron-forward'} label={t('reports.next')} disabled={month >= monthStart()} onPress={() => setMonth(addMonths(month, 1))} />
      </Row>

      <Card tone={overallState === 'over' ? 'bad' : overallState === 'near' ? 'warn' : 'plain'}>
        <Text color={colors.inkMuted}>{t('reports.total')}</Text>
        <Money laari={total} variant="display" />
        {incomeTotal > 0 ? (
          <View style={{ gap: 2 }}>
            <Row><Text style={{ flex: 1 }} color={colors.inkMuted}>{t('reports.income')}</Text><Money laari={incomeTotal} /></Row>
            <Row><Text style={{ flex: 1 }} color={colors.inkMuted}>{t('reports.net')}</Text><Money laari={incomeTotal - total} /></Row>
          </View>
        ) : null}
        {overall ? (
          <>
            <ProgressBar percent={percentUsed(total, overall)} state={overallState === 'none' ? 'ok' : overallState} label={t('a11y.progress', { percent: percentUsed(total, overall) })} />
            <Row>
              {overallState !== 'ok' ? <Icon name={overallState === 'over' ? 'alert-circle' : 'warning'} color={overallState === 'over' ? colors.coral : colors.amberDeep} /> : null}
              {overallState === 'over'
                ? <Msg k="reports.overBy" amounts={{ amount: total - overall }} color={colors.coral} style={{ flex: 1 }} />
                : <Msg k="reports.leftOf" amounts={{ amount: overall - total, limit: overall }} style={{ flex: 1 }} />}
            </Row>
            {overallState === 'near' ? <Text>{t('reports.nearLimit')}</Text> : null}
          </>
        ) : null}
      </Card>

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
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1}>{i.note || t('reports.income')}</Text>
                  <Text latin variant="small" color={colors.inkMuted}>{formatDate(i.received_at)}</Text>
                </View>
                <Money laari={i.mvr_laari} />
                <IconButton icon="trash-outline" label={t('common.remove')}
                  onPress={() => Alert.alert(t('income.deleteTitle'), undefined, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.remove'), style: 'destructive', onPress: () => removeIncome.mutate(i.id) }])} />
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
                    <Icon name={(c?.icon ?? 'ellipsis') as IconName} color={colors.accent} />
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
          <Card>{expenses.map((e) => <ExpenseRow key={e.id} expense={e} category={e.category_id ? byId.get(e.category_id) : undefined} />)}</Card>
        </>
      )}
    </Screen>
  );
}
