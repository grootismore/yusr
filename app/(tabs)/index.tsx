import { useEffect, useMemo, useState } from 'react';
import { markBoot } from '@/lib/boot';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SharedCard } from '@/features/household/SharedCard';
import { SharedRow } from '@/components/SharedRow';
import { recentRows, type RecentRow } from '@/features/household/recent';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { LoadError } from '@/components/LoadError';
import { Button, Card, Icon, IconButton, Logo, PanelArt, ProgressBar, Row, Screen, ScreenTitle, Tile, type IconName } from '@/components/ui';
import { paydayValue } from '@/features/foreign/logic';
import { setHideAmounts, useHideAmounts, useMoneyText } from '@/lib/privacy';
import { setFlag, useFlag } from '@/lib/flags';
import { dueRuns } from '@/features/recurring/logic';
import { useRefresh, useBudgets, useCategories, useCategoryName, useDebtPayments, useDebts, useExpenses, useGiving, useHoldings, useIncome, usePlanSettings, useHouseholdEntries, useRecurring, useRecurringRuns, useSharedTotals, useZakat } from '@/data/hooks';
import { goalPercent, monthGiving } from '@/features/giving/logic';
import { computePlan, nextDue } from '@/features/debts/compute';
import { DueBadge, useMonthLabel } from '@/features/debts/ui';
import { useFeature } from '@/features/features/hooks';
import { useRule } from '@/features/rule/hooks';
import { RuleCard } from '@/features/rule/ui';
import { budgetState, percentUsed } from '@/lib/budget';
import { DEFAULT_PLAN } from '@/data/api';
import { addDays, formatDate, monthStart, today } from '@/lib/dates';
import { LIFT, radius, space, useColors } from '@/theme/tokens';

type AddKind = 'expense' | 'income' | 'split';

/**
 * The one entry point on Home: a round plus floating above the tab bar, always in reach. Tap it and it opens into the three
 * things you can add (an expense, income, a split payday); tap away to close. Home only.
 */
function AddMenu({ bottom, onPick }: { bottom: number; onPick: (kind: AddKind) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const options: { kind: AddKind; icon: IconName; label: string }[] = [
    { kind: 'split', icon: 'git-compare-outline', label: t('home.addSplit') },
    { kind: 'income', icon: 'arrow-down', label: t('home.addIncome') },
    { kind: 'expense', icon: 'arrow-up', label: t('home.addExpense') },
  ];
  return (
    <>
      {open ? <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', end: space.lg, bottom, alignItems: 'flex-end', gap: space.md }}>
        {open ? options.map((o) => (
          <Pressable key={o.kind} accessibilityRole="button" accessibilityLabel={o.label} onPress={() => { setOpen(false); onPick(o.kind); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingStart: space.lg, paddingEnd: space.xl, borderRadius: 26, borderCurve: 'continuous', backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.cardEdge, boxShadow: LIFT, opacity: pressed ? 0.85 : 1 })}>
            <Icon name={o.icon} color={colors.accent} />
            <Text variant="label">{o.label}</Text>
          </Pressable>
        )) : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={t('home.addExpense')} onPress={() => setOpen(!open)}
          style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, boxShadow: LIFT, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
          <View style={{ transform: [{ rotate: open ? '45deg' : '0deg' }] }}><Icon name="add" color={colors.onAccent} size={30} /></View>
        </Pressable>
      </View>
    </>
  );
}

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
  const sharedEntries = useHouseholdEntries(month).data;
  // Recent: your own and the shared pot's expenses together.
  const recentGroups = useMemo(() => {
    const groups = new Map<string, RecentRow[]>();
    for (const r of recentRows(expenses, sharedEntries, 6)) groups.set(r.date, [...(groups.get(r.date) ?? []), r]);
    return [...groups];
  }, [expenses, sharedEntries]);
  const showTiles = (!!limit && state !== 'over') || incomeTotal > 0;
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
      <AddMenu bottom={Math.max(insets.bottom, space.sm) + space.xs + 72 + space.md} onPick={(kind) => router.push({ pathname: '/add-expense', params: { mode: kind } })} />
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
        <Text color={colors.onHero}>{t('home.thisMonth')} · {t('home.spent')}</Text>
        {expensesQuery.isLoading && !expensesQuery.data
          // Until the month has loaded, show a dash: a zero would read as a real, wrong figure.
          ? <Text latin variant="display" color={colors.onHero} style={{ fontSize: 44, lineHeight: 56 }} accessibilityLabel={t('common.loading')}>MVR —</Text>
          : <Money laari={spent} variant="display" numberOfLines={1} adjustsFontSizeToFit color={colors.onHero} style={{ fontSize: 44, lineHeight: 56 }} />}
        {limit ? (
          <>
            <Msg k="home.ofBudget" amounts={{ budget: limit }} variant="small" color={colors.onHero} />
            <ProgressBar onHero percent={percentUsed(spent, limit)} state={state === 'none' ? 'ok' : state} label={t('a11y.progress', { percent: percentUsed(spent, limit) })} />
            {state === 'over' || state === 'near' ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/budget')}
                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name={state === 'over' ? 'information-circle' : 'warning'} size={18} color={colors.amber} />
                {state === 'over'
                  ? <Msg k="home.overNext" amounts={{ amount: spent - limit }} variant="small" color={colors.onHero} style={{ flexShrink: 1 }} />
                  : <Text variant="small" color={colors.onHero}>{t('home.nearLimit')}</Text>}
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text color={colors.onHero}>{t('home.noBudget')}</Text>
            <Button kind="secondary" label={t('home.setBudget')} onPress={() => router.push('/budget')} style={{ backgroundColor: colors.onHero, borderColor: colors.onHero }} />
          </>
        )}
        {incomeTotal > 0 ? <Msg k="home.incomeLine" amounts={{ amount: incomeTotal }} variant="small" color={colors.onHero} /> : null}
        {shared.spent > 0 ? <Msg k="household.includesShared" amounts={{ amount: shared.spent }} variant="small" color={colors.onHero} /> : null}
      </View>

      {showTiles ? (
        <Row style={{ alignItems: 'stretch', gap: space.md, marginTop: -44, paddingHorizontal: space.lg }}>
          {limit && state !== 'over' ? <Tile color={colors.sky} label={t('home.leftLabel')} laari={limit - spent} /> : null}
          {incomeTotal > 0 ? <Tile color={colors.tile} label={t('add.income')} laari={incomeTotal} onPress={() => router.push({ pathname: '/income', params: { month } })} /> : null}
        </Row>
      ) : null}


      <View style={{ paddingHorizontal: space.lg, gap: space.lg, marginTop: showTiles ? space.lg : -36 + space.lg }}>
      {featHousehold ? <SharedCard /> : null}
      <RuleCard lines={rule.lines} income={rule.income} debtPaid={rule.debtPaid} />
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

      {featRecurring && recurringDue > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('recurring.dueCard', { count: recurringDue })} onPress={() => router.push('/recurring')}>
          <Card>
            <Row>
              <Icon name="repeat" color={colors.accent} />
              <Text variant="heading" style={{ flex: 1 }}>{t('recurring.dueCard', { count: recurringDue })}</Text>
              <Icon name={'chevron-forward'} color={colors.inkMuted} />
            </Row>
          </Card>
        </Pressable>
      ) : null}

      {featDebts && debtPlan.open.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('debts.title')} onPress={() => router.push('/debts')}>
          <Card>
            <Row>
              <Icon name="leaf-outline" color={colors.accent} />
              <Text variant="heading" style={{ flex: 1 }}>{t('debts.title')}</Text>
              <Icon name={'chevron-forward'} color={colors.inkMuted} />
            </Row>
            <Money laari={debtPlan.total} variant="title" />
            {debtPlan.result.debtFreeMonth ? <Text color={colors.inkMuted}>{t('debts.debtFree', { month: monthLabel(debtPlan.result.debtFreeMonth) })}</Text> : null}
            {due ? <><Text>{t('debts.nextDue', { name: due.debt.lender })}</Text><DueBadge state={due.due.state} days={due.due.days} /></> : <Text color={colors.inkMuted}>{t('debts.onTrack')}</Text>}
          </Card>
        </Pressable>
      ) : null}

      {featGiving && (goal || giving.total > 0) ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('giving.title')} onPress={() => router.push('/giving')}>
          <Card>
            <Row>
              <Icon name="heart-outline" color={colors.accent} />
              <Text variant="heading" style={{ flex: 1 }}>{t('giving.title')}</Text>
              <Icon name={'chevron-forward'} color={colors.inkMuted} />
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
