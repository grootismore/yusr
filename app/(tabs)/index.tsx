import { useMemo, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, ProgressBar, Row, Screen, ScreenTitle, Tile, type IconName } from '@/components/ui';
import { useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, useGiving, useIncome, usePlanSettings, useZakat } from '@/data/hooks';
import { goalPercent, monthGiving } from '@/features/giving/logic';
import { computePlan, nextDue } from '@/features/debts/compute';
import { DueBadge, useMonthLabel } from '@/features/debts/ui';
import { budgetState, percentUsed } from '@/lib/budget';
import { DEFAULT_PLAN } from '@/data/api';
import { addDays, formatDate, monthStart, today } from '@/lib/dates';
import { radius, space, useColors } from '@/theme/tokens';

/** Round shortcut: an icon in a circle over a short label. */
function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: space.xs, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.cardEdge, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={colors.accent} />
      </View>
      <Text variant="small" numberOfLines={2} style={{ textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [scrollY] = useState(() => new Animated.Value(0));
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
  const recentGroups = useMemo(() => {
    const groups = new Map<string, typeof expenses>();
    for (const e of expenses.slice(0, 6)) groups.set(e.spent_at, [...(groups.get(e.spent_at) ?? []), e]);
    return [...groups];
  }, [expenses]);
  const showTiles = (!!limit && state !== 'over') || incomeTotal > 0;
  const top = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.mvr_laari);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [expenses]);

  if (expenses.length === 0 && !expensesQuery.isLoading) {
    return (
      <Screen tabbed>
        <ScreenTitle title={t('app.name')} />
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <Icon name="receipt-outline" size={44} color={colors.accent} />
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('home.emptyTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('home.emptyBody')}</Text>
          <Button label={t('home.addExpense')} icon="add" onPress={() => router.push('/add-expense')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen padded={false} bleed tabbed scrollY={scrollY} overlay={
      // The big band scrolls away; this slim bar fades in under the status bar so the month's figure stays in view.
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, start: 0, end: 0, backgroundColor: colors.hero, paddingTop: insets.top + space.sm, paddingBottom: space.md, paddingHorizontal: space.xl,
        opacity: scrollY.interpolate({ inputRange: [110, 190], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [110, 190], outputRange: [-12, 0], extrapolate: 'clamp' }) }] }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text color={colors.onHero}>{t('app.name')}</Text>
          <Money laari={spent} variant="heading" color={colors.onHero} />
        </Row>
      </Animated.View>
    }>
      {/* Header band: runs under the status bar, carries the month's figure; the shortcut tiles overlap its lower edge. */}
      <View style={{ backgroundColor: colors.hero, paddingTop: insets.top + space.md, paddingHorizontal: space.xl, paddingBottom: 72, gap: space.md,
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32, borderCurve: 'continuous', overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -70, end: -60, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.10)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: -100, start: -50, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <Text variant="heading" color={colors.onHero} accessibilityRole="header">{t('app.name')}</Text>
        <Text color={colors.onHero}>{t('home.thisMonth')} · {t('home.spent')}</Text>
        <Money laari={spent} variant="display" numberOfLines={1} adjustsFontSizeToFit color={colors.onHero} style={{ fontSize: 44, lineHeight: 56 }} />
        {incomeTotal > 0 ? <Msg k="home.incomeLine" amounts={{ amount: incomeTotal }} variant="small" color={colors.onHero} /> : null}
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
            <Msg k="home.ofBudget" amounts={{ budget: limit }} variant="small" color={colors.onHero} />
          </>
        ) : (
          <>
            <Text color={colors.onHero}>{t('home.noBudget')}</Text>
            <Button kind="secondary" label={t('home.setBudget')} onPress={() => router.push('/budget')} style={{ backgroundColor: colors.onHero, borderColor: colors.onHero }} />
          </>
        )}
      </View>

      {showTiles ? (
        <Row style={{ alignItems: 'stretch', gap: space.md, marginTop: -44, paddingHorizontal: space.lg }}>
          {limit && state !== 'over' ? <Tile color={colors.mint} label={t('home.leftLabel')} laari={limit - spent} /> : null}
          {incomeTotal > 0 ? <Tile color={colors.lilac} label={t('add.income')} laari={incomeTotal} /> : null}
        </Row>
      ) : null}

      <Row style={{ alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.lg, marginTop: showTiles ? 0 : -36 }}>
        <QuickAction icon="add" label={t('home.addExpense')} onPress={() => router.push('/add-expense')} />
        <QuickAction icon="scan" label={t('tabs.raseedhu')} onPress={() => router.push('/scan')} />
        <QuickAction icon="leaf-outline" label={t('more.debts')} onPress={() => router.push('/debts')} />
        <QuickAction icon="heart-outline" label={t('more.giving')} onPress={() => router.push('/giving')} />
      </Row>

      <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
      {debtPlan.open.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('debts.title')} onPress={() => router.push('/debts')}>
          <Card>
            <Row>
              <Icon name="leaf-outline" color={colors.accent} />
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
              <Icon name="heart-outline" color={colors.accent} />
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
                  <Icon name={(c?.icon ?? 'ellipsis') as IconName} color={colors.accent} />
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
          <Button kind="ghost" label={t('home.seeAll')} onPress={() => router.push('/activity')} />
        </Row>
        <Card>
          {recentGroups.map(([day, rows]) => (
            <View key={day} style={{ gap: space.xs }}>
              <Text variant="small" color={colors.inkMuted}>{day === today() ? t('common.today') : day === addDays(today(), -1) ? t('common.yesterday') : <Text latin variant="small" color={colors.inkMuted}>{formatDate(day)}</Text>}</Text>
              {rows.map((e) => <ExpenseRow key={e.id} hideDate expense={e} category={e.category_id ? byId.get(e.category_id) : undefined} />)}
            </View>
          ))}
        </Card>
      </View>
      </View>
    </Screen>
  );
}
