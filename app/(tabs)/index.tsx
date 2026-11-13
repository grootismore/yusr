import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, ProgressBar, Row, Screen, type IconName } from '@/components/ui';
import { useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, usePlanSettings } from '@/data/hooks';
import { computePlan, nextDue } from '@/features/debts/compute';
import { DueBadge, useMonthLabel } from '@/features/debts/ui';
import { budgetState, percentUsed } from '@/lib/budget';
import { DEFAULT_PLAN } from '@/data/api';
import { monthStart, today } from '@/lib/dates';
import { colors, space } from '@/theme/tokens';

export default function Home() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const catName = useCategoryName();
  const month = monthStart();
  const expensesQuery = useExpenses(month);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const budgets = useBudgets(month).data;
  const categoriesQuery = useCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const monthLabel = useMonthLabel();
  const debtsQ = useDebts();
  const paymentsQ = useDebtPayments();
  const planSettings = usePlanSettings().data ?? DEFAULT_PLAN;
  const debtPlan = useMemo(() => computePlan(debtsQ.data ?? [], paymentsQ.data ?? [], planSettings, today()), [debtsQ.data, paymentsQ.data, planSettings]);
  const due = nextDue(debtPlan);

  const spent = expenses.reduce((s, e) => s + e.mvr_laari, 0);
  const limit = budgets?.get(null);
  const state = budgetState(spent, limit);
  const top = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.mvr_laari);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [expenses]);

  if (expenses.length === 0 && !expensesQuery.isLoading) {
    return (
      <Screen>
        <Text variant="title" color={colors.teal}>{t('app.name')}</Text>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <Icon name="receipt-outline" size={44} color={colors.teal} />
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('home.emptyTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('home.emptyBody')}</Text>
          <Button label={t('home.addExpense')} icon="add" onPress={() => router.push('/add-expense')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" color={colors.teal}>{t('app.name')}</Text>
        <Button kind="secondary" label={t('home.addExpense')} icon="add" onPress={() => router.push('/add-expense')} />
      </Row>

      <Card tone={state === 'over' ? 'bad' : state === 'near' ? 'warn' : 'plain'}>
        <Text color={colors.inkMuted}>{t('home.thisMonth')} · {t('home.spent')}</Text>
        <Money laari={spent} variant="display" />
        {limit ? (
          <>
            <ProgressBar percent={percentUsed(spent, limit)} state={state === 'none' ? 'ok' : state} label={t('a11y.progress', { percent: percentUsed(spent, limit) })} />
            <Row>
              {state !== 'ok' ? <Icon name={state === 'over' ? 'alert-circle' : 'warning'} color={state === 'over' ? colors.coral : colors.amberDeep} /> : null}
              {state === 'over'
                ? <Msg k="home.over" amounts={{ amount: spent - limit }} color={colors.coral} style={{ flex: 1 }} />
                : <Msg k="home.left" amounts={{ amount: limit - spent }} style={{ flex: 1 }} />}
            </Row>
            {state === 'near' ? <Text>{t('home.nearLimit')}</Text> : null}
            <Msg k="home.ofBudget" amounts={{ budget: limit }} variant="small" color={colors.inkMuted} />
          </>
        ) : (
          <>
            <Text color={colors.inkMuted}>{t('home.noBudget')}</Text>
            <Button kind="secondary" label={t('home.setBudget')} onPress={() => router.push('/budget')} />
          </>
        )}
      </Card>

      {debtPlan.open.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('debts.title')} onPress={() => router.push('/debts')}>
          <Card>
            <Row>
              <Icon name="leaf-outline" color={colors.teal} />
              <Text variant="heading" style={{ flex: 1 }}>{t('debts.title')}</Text>
              <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} color={colors.inkMuted} />
            </Row>
            <Money laari={debtPlan.total} variant="title" />
            {debtPlan.result.debtFreeMonth ? <Text color={colors.inkMuted}>{t('debts.debtFree', { month: monthLabel(debtPlan.result.debtFreeMonth) })}</Text> : null}
            {due ? <><Text>{t('debts.nextDue', { name: due.debt.lender })}</Text><DueBadge state={due.due.state} days={due.due.days} /></> : <Text color={colors.inkMuted}>{t('debts.onTrack')}</Text>}
          </Card>
        </Pressable>
      ) : null}

      <View style={{ gap: space.md }}>
        <Text variant="heading">{t('home.topCategories')}</Text>
        <Card>
          {top.map(([id, amount]) => {
            const c = id ? byId.get(id) : undefined;
            return (
              <View key={id ?? 'none'} style={{ gap: space.xs }}>
                <Row>
                  <Icon name={(c?.icon ?? 'ellipsis') as IconName} color={colors.teal} />
                  <Text style={{ flex: 1 }}>{catName(c)}</Text>
                  <Money laari={amount} />
                </Row>
                <ProgressBar percent={percentUsed(amount, Math.max(spent, 1))} state="ok" label={catName(c)} />
              </View>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="heading">{t('home.recent')}</Text>
          <Button kind="ghost" label={t('home.seeAll')} onPress={() => router.push('/reports')} />
        </Row>
        <Card>{expenses.slice(0, 5).map((e) => <ExpenseRow key={e.id} expense={e} category={e.category_id ? byId.get(e.category_id) : undefined} />)}</Card>
      </View>
    </Screen>
  );
}
