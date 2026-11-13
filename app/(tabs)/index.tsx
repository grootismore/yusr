import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, ProgressBar, Row, Screen, ScreenTitle, type IconName } from '@/components/ui';
import { useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, useGiving, useIncome, usePlanSettings, useZakat } from '@/data/hooks';
import { goalPercent, monthGiving } from '@/features/giving/logic';
import { computePlan, nextDue } from '@/features/debts/compute';
import { DueBadge, useMonthLabel } from '@/features/debts/ui';
import { budgetState, percentUsed } from '@/lib/budget';
import { DEFAULT_PLAN } from '@/data/api';
import { monthStart, today } from '@/lib/dates';
import { radius, space, useColors } from '@/theme/tokens';

/** Round-cornered shortcut tile: icon over a short label. */
function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.sm, borderRadius: radius.lg, borderCurve: 'continuous',
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.teal} />
      </View>
      <Text variant="small" numberOfLines={2} style={{ textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const colors = useColors();
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
  const incomeQ = useIncome(month);
  const incomeTotal = (incomeQ.data ?? []).reduce((s, i) => s + i.mvr_laari, 0);
  const givingQ = useGiving(month);
  const giving = useMemo(() => monthGiving(givingQ.data ?? []), [givingQ.data]);
  const goal = useZakat().data?.sadaqah_goal_laari ?? null;

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
        <ScreenTitle title={t('app.name')} />
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
      <ScreenTitle title={t('app.name')} />

      <Card tone="hero" style={{ gap: space.lg, padding: space.xl, overflow: 'hidden' }}>
        {/* Soft shapes give the card depth without an image or a gradient dependency. */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -60, end: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.10)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: -90, start: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <Text color={colors.onTeal}>{t('home.thisMonth')} · {t('home.spent')}</Text>
        <Money laari={spent} variant="display" color={colors.onTeal} style={{ fontSize: 40, lineHeight: 52 }} />
        {incomeTotal > 0 ? <Msg k="home.incomeLine" amounts={{ amount: incomeTotal }} variant="small" color={colors.onTeal} /> : null}
        {limit ? (
          <>
            <ProgressBar onHero percent={percentUsed(spent, limit)} state={state === 'none' ? 'ok' : state} label={t('a11y.progress', { percent: percentUsed(spent, limit) })} />
            {state === 'over' || state === 'near' ? (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: state === 'over' ? colors.coralWash : colors.amberWash }}>
                <Icon name={state === 'over' ? 'alert-circle' : 'warning'} size={18} color={state === 'over' ? colors.coral : colors.amberDeep} />
                {state === 'over'
                  ? <Msg k="home.over" amounts={{ amount: spent - limit }} variant="small" color={colors.coral} />
                  : <Text variant="small" color={colors.ink}>{t('home.nearLimit')}</Text>}
              </View>
            ) : null}
            {state === 'over' ? null : <Msg k="home.left" amounts={{ amount: limit - spent }} color={colors.onTeal} />}
            <Msg k="home.ofBudget" amounts={{ budget: limit }} variant="small" color={colors.onTeal} />
          </>
        ) : (
          <>
            <Text color={colors.onTeal}>{t('home.noBudget')}</Text>
            <Button kind="secondary" label={t('home.setBudget')} onPress={() => router.push('/budget')} style={{ backgroundColor: colors.onTeal, borderColor: colors.onTeal }} />
          </>
        )}
      </Card>

      <Row style={{ alignItems: 'stretch', gap: space.sm }}>
        <QuickAction icon="add" label={t('home.addExpense')} onPress={() => router.push('/add-expense')} />
        <QuickAction icon="scan" label={t('tabs.raseedhu')} onPress={() => router.push('/scan')} />
        <QuickAction icon="leaf-outline" label={t('more.debts')} onPress={() => router.push('/debts')} />
        <QuickAction icon="heart-outline" label={t('more.giving')} onPress={() => router.push('/giving')} />
      </Row>

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

      {goal || giving.total > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('giving.title')} onPress={() => router.push('/giving')}>
          <Card>
            <Row>
              <Icon name="heart-outline" color={colors.teal} />
              <Text variant="heading" style={{ flex: 1 }}>{t('giving.title')}</Text>
              <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} color={colors.inkMuted} />
            </Row>
            {goal ? (
              <>
                <Msg k="giving.homeCardGoal" amounts={{ given: giving.goalCounted, goal }} />
                <ProgressBar percent={Math.min(100, goalPercent(giving.goalCounted, goal))} state="ok" label={t('a11y.progress', { percent: goalPercent(giving.goalCounted, goal) })} />
              </>
            ) : <Msg k="giving.homeCardGiven" amounts={{ given: giving.total }} />}
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
