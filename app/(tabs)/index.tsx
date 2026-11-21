import { useEffect, useMemo, useState } from 'react';
import { markBoot } from '@/lib/boot';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HouseholdGlanceRow } from '@/features/household/SharedCard';
import { SharedRow } from '@/components/SharedRow';
import { recentRows, type RecentRow } from '@/features/household/recent';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { LoadError } from '@/components/LoadError';
import { Button, Card, Icon, IconButton, ListRow, Logo, PanelArt, ProgressBar, Row, Screen, ScreenTitle, type IconName } from '@/components/ui';
import { paydayValue } from '@/features/foreign/logic';
import { setHideAmounts, useHideAmounts, useMoneyText } from '@/lib/privacy';
import { setFlag, useFlag } from '@/lib/flags';
import { dueRuns } from '@/features/recurring/logic';
import { useRefresh, useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, useGiving, useHoldings, useIncome, usePlanSettings, useHouseholdEntries, useRecurring, useRecurringRuns, useSharedTotals, useZakat } from '@/data/hooks';
import { monthGiving } from '@/features/giving/logic';
import { computePlan, nextDue } from '@/features/debts/compute';
import { DueBadge, useMonthLabel } from '@/features/debts/ui';
import { useFeature } from '@/features/features/hooks';
import { useRule } from '@/features/rule/hooks';
import { RuleCard } from '@/features/rule/ui';
import { budgetState, dailyAllowance, percentUsed } from '@/lib/budget';
import { DEFAULT_PLAN } from '@/data/api';
import { addDays, formatDate, monthStart, today } from '@/lib/dates';
import { radius, space, useColors } from '@/theme/tokens';

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => { markBoot('home'); }, []);
  const [scrollY] = useState(() => new Animated.Value(0));
  const { t } = useTranslation();
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
  const rule = useRule(month);
  const refresh = useRefresh();
  const featRecurring = useFeature('recurring'), featDebts = useFeature('debts'), featGiving = useFeature('giving'), featHousehold = useFeature('household');
  const incomeQ = useIncome(month);
  const shared = useSharedTotals(month);
  // In a couple or household, the whole shared pot counts alongside your own.
  const incomeTotal = (incomeQ.data ?? []).reduce((s, i) => s + i.mvr_laari, 0) + shared.income;
  const givingQ = useGiving(month);
  const giving = useMemo(() => monthGiving(givingQ.data ?? []), [givingQ.data]);
  const goal = useZakat().data?.sadaqah_goal_laari ?? null;
  const { held } = useHoldings();
  const money = useMoneyText();
  const recurringItems = useRecurring().data;
  const recurringRuns = useRecurringRuns().data;
  const recurringDue = useMemo(() => dueRuns((recurringItems ?? []).filter((i) => !i.ended_on && !i.auto_add), recurringRuns ?? [], today()).length, [recurringItems, recurringRuns]);
  const hidden = useHideAmounts();
  const heldOpen = useFlag('heldOpen') === true;

  const spent = expenses.reduce((s, e) => s + e.mvr_laari, 0) + shared.spent;
  const limit = budgets?.get(null);
  const state = budgetState(spent, limit);
  const allowance = dailyAllowance(spent, limit ?? 0, today());
  const sharedEntries = useHouseholdEntries(month).data;
  // Recent: your own and the shared pot's expenses together.
  const recentGroups = useMemo(() => {
    const groups = new Map<string, RecentRow[]>();
    for (const r of recentRows(expenses, sharedEntries, 6)) groups.set(r.date, [...(groups.get(r.date) ?? []), r]);
    return [...groups];
  }, [expenses, sharedEntries]);
  const showTiles = incomeTotal > 0; // what is left is the headline of the panel above, so it is not repeated as a tile
  const top = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.mvr_laari);
    for (const [id, v] of shared.byCategory) m.set(id, (m.get(id) ?? 0) + v);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [expenses, shared]);

  if (expensesQuery.isError && !expensesQuery.data) {
    return <Screen tabbed><ScreenTitle title={t('app.name')} /><LoadError onRetry={() => void expensesQuery.refetch()} busy={expensesQuery.isFetching} /></Screen>;
  }
  if (expenses.length === 0 && shared.spent === 0 && !expensesQuery.isLoading) {
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
    <Screen padded={false} bleed tabbed scrollY={scrollY} onRefresh={refresh} overlay={
      <>
      {/* The big band scrolls away; this slim bar fades in under the status bar so the month's figure stays in view. */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, start: 0, end: 0, backgroundColor: colors.hero, paddingTop: insets.top + space.sm, paddingBottom: space.md, paddingHorizontal: space.xl,
        opacity: scrollY.interpolate({ inputRange: [110, 190], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [110, 190], outputRange: [-12, 0], extrapolate: 'clamp' }) }] }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text color={colors.onHero}>{t('app.name')}</Text>
          <Money laari={spent} variant="heading" color={colors.onHero} />
        </Row>
      </Animated.View>
      </>
    }>
      {/* Pulling the page down past the top shows the panel colour, not the page colour behind it. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -900, start: 0, end: 0, height: 900, backgroundColor: colors.hero }} />
      {/* Header band: runs under the status bar, carries the month's figure; the shortcut tiles overlap its lower edge. */}
      <View style={{ backgroundColor: colors.hero, paddingTop: insets.top + space.md, paddingHorizontal: space.xl, paddingBottom: 72, gap: space.md,
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32, borderCurve: 'continuous', overflow: 'hidden' }}>
        <PanelArt />
        <Row style={{ gap: space.sm, justifyContent: 'space-between' }}>
          <Row style={{ gap: space.sm }}>
            <Logo size={28} />
            <Text variant="heading" color={colors.onHero} accessibilityRole="header">{t('app.name')}</Text>
          </Row>
          <IconButton icon={hidden ? 'eye-off-outline' : 'eye-outline'} color={colors.onHero} label={hidden ? t('privacy.show') : t('privacy.hide')} onPress={() => void setHideAmounts(!hidden)} />
        </Row>
        <Text color={colors.onHero}>{limit ? t(state === 'over' ? 'home.overHeadline' : 'home.leftHeadline') : `${t('home.thisMonth')} · ${t('home.spent')}`}</Text>
        {expensesQuery.isLoading && !expensesQuery.data
          // Until the month has loaded, show a dash: a zero would read as a real, wrong figure.
          ? <Text latin variant="display" color={colors.onHero} style={{ fontSize: 44, lineHeight: 56 }} accessibilityLabel={t('common.loading')}>MVR —</Text>
          : <Money laari={limit ? Math.abs(limit - spent) : spent} variant="display" numberOfLines={1} adjustsFontSizeToFit color={limit && state === 'over' ? '#FF8A7A' : colors.onHero} style={{ fontSize: 44, lineHeight: 56 }} />}
        {limit ? (
          <>
            {state !== 'over' ? <Msg k="home.perDay" amounts={{ amount: allowance.perDay }} values={{ days: allowance.days }} variant="small" color={colors.onHero} /> : null}
            <ProgressBar onHero percent={percentUsed(spent, limit)} state={state === 'none' ? 'ok' : state} label={t('a11y.progress', { percent: percentUsed(spent, limit) })} />
            <Msg k="home.spentOfBudget" amounts={{ spent, budget: limit }} variant="small" color={colors.onHero} />
            {state === 'over' || state === 'near' ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/budget')}
                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name={state === 'over' ? 'information-circle' : 'warning'} size={18} color={state === 'over' ? '#FF8A7A' : colors.amber} />
                <Text variant="small" color={colors.onHero} style={{ flexShrink: 1 }}>{t(state === 'over' ? 'home.overAction' : 'home.nearLimit')}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text color={colors.onHero}>{t('home.noBudget')}</Text>
            <Button kind="secondary" label={t('home.setBudget')} onPress={() => router.push('/budget')} style={{ backgroundColor: colors.onHero, borderColor: colors.onHero }} />
          </>
        )}
      </View>

      {showTiles ? (
        <View style={{ marginTop: -44, paddingHorizontal: space.lg }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('add.income')} onPress={() => router.push({ pathname: '/income', params: { month } })}>
            <Card style={{ paddingVertical: space.md }}>
              <Row>
                <Text style={{ flex: 1 }}>{t('add.income')}</Text>
                <Money laari={incomeTotal} variant="heading" color={colors.income} />
                <Icon name="chevron-forward" size={20} color={colors.inkMuted} />
              </Row>
            </Card>
          </Pressable>
        </View>
      ) : null}


      <View style={{ paddingHorizontal: space.lg, gap: space.lg, marginTop: showTiles ? space.lg : -36 + space.lg }}>
      <RuleCard lines={rule.lines} income={rule.income} debtPaid={rule.debtPaid} />
      {(() => {
        const showDebts = featDebts && debtPlan.open.length > 0;
        const showGiving = featGiving && (goal || giving.total > 0);
        const showRecurring = featRecurring && recurringDue > 0;
        const rows: ('household' | 'recurring' | 'debts' | 'giving')[] = [...(featHousehold ? ['household' as const] : []), ...(showRecurring ? ['recurring' as const] : []), ...(showDebts ? ['debts' as const] : []), ...(showGiving ? ['giving' as const] : [])];
        if (!rows.length) return null;
        const last = (k: string) => rows[rows.length - 1] === k;
        const chev = <Icon name="chevron-forward" size={20} color={colors.inkMuted} />;
        return (
          <Card style={{ paddingVertical: space.xs }}>
            {featHousehold ? <HouseholdGlanceRow last={last('household')} /> : null}
            {showRecurring ? <ListRow icon="repeat" title={t('recurring.dueCard', { count: recurringDue })} onPress={() => router.push('/recurring')} last={last('recurring')} /> : null}
            {showDebts ? (
              <ListRow icon="leaf-outline" title={t('debts.title')} last={last('debts')} onPress={() => router.push('/debts')}
                subtitle={debtPlan.result.debtFreeMonth ? t('debts.debtFree', { month: monthLabel(debtPlan.result.debtFreeMonth) }) : t('debts.onTrack')}
                meta={due ? <DueBadge state={due.due.state} days={due.due.days} /> : null}
                trailing={<Row style={{ gap: space.sm }}><Money laari={debtPlan.total} variant="label" />{chev}</Row>} />
            ) : null}
            {showGiving ? (
              <ListRow icon="heart-outline" title={t('giving.title')} last={last('giving')} onPress={() => router.push('/giving')}
                subtitle={goal ? t('giving.homeCardGoal', { given: money(giving.goalCounted), goal: money(goal) }) : t('giving.homeCardGiven', { given: money(giving.total) })} />
            ) : null}
          </Card>
        );
      })()}

      {held.length > 0 ? (
        <Card>
          {/* Folded by default so the figures are not on show; one tap opens it, and Convert is inside. */}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: heldOpen }} onPress={() => void setFlag('heldOpen', !heldOpen)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Row>
              <Text variant="heading" style={{ flex: 1 }}>{t('foreign.held')}</Text>
              <Text variant="small" color={colors.inkMuted}>{heldOpen ? t('foreign.hideHeld') : t('foreign.showHeld')}</Text>
              <Icon name={heldOpen ? 'chevron-up' : 'chevron-down'} color={colors.inkMuted} />
            </Row>
          </Pressable>
          {heldOpen ? held.map((x) => (
            <Row key={x.currency} style={{ minHeight: 56 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text latin variant="heading" style={{ writingDirection: 'ltr' }}>{money(x.minor, x.currency)}</Text>
                <Msg k="foreign.heldMvr" amounts={{ amount: paydayValue(x, x.minor) }} variant="small" color={colors.inkMuted} />
              </View>
              <Button kind="secondary" label={t('foreign.convert')} onPress={() => router.push({ pathname: '/convert', params: { currency: x.currency } })} />
            </Row>
          )) : null}
        </Card>
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
              {rows.map((r) => r.kind === 'own'
                ? <ExpenseRow key={r.expense.id} hideDate expense={r.expense} category={r.expense.category_id ? byId.get(r.expense.category_id) : undefined} />
                : <SharedRow key={r.entry.id} hideDate entry={r.entry} category={r.entry.category_id ? byId.get(r.entry.category_id) : undefined} />)}
            </View>
          ))}
        </Card>
      </View>
      </View>
    </Screen>
  );
}
