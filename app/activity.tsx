import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Card, Chip, Field, Icon, IconButton, Row, Screen, Segmented, StackHeader } from '@/components/ui';
import { Msg } from '@/components/Msg';
import { SharedRow } from '@/components/SharedRow';
import { useCategories, useCategoryName, useExpenses, useHouseholdEntries, useIncome, useRefresh } from '@/data/hooks';
import { categoryChips, totalsByDay } from '@/features/activity/logic';
import { matchesSearch } from '@/lib/search';
import { useMoneyText } from '@/lib/privacy';
import { addDays, addMonths, formatDate, monthStart, today } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';

type Filter = 'all' | 'income' | 'expenses';

/** Everything that moved in a month, newest day first, with All / Income / Expenses tabs. */
export default function Activity() {
  const colors = useColors();
  const { t } = useTranslation();
  const money = useMoneyText();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(monthStart());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null); // filter: only spending in this category
  const catName = useCategoryName();
  const expenses = useExpenses(month).data;
  const income = useIncome(month).data;
  const refresh = useRefresh();
  const shared = useHouseholdEntries(month).data;
  const cats = useCategories().data;
  const byId = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c])), [cats]);

  const days = useMemo(() => {
    type Row = { kind: 'expense' | 'income' | 'shared'; id: string };
    const groups = new Map<string, Row[]>();
    const add = (date: string, row: Row) => groups.set(date, [...(groups.get(date) ?? []), row]);
    const cat = (id: string | null) => { const c = id ? byId.get(id) : undefined; return c ? catName(c) : null; };
    if (filter !== 'income') for (const e of expenses ?? []) if ((!category || e.category_id === category) && matchesSearch(search, [e.merchant, e.note, cat(e.category_id), e.mvr_laari])) add(e.spent_at, { kind: 'expense', id: e.id });
    if (filter !== 'expenses' && !category) for (const i of income ?? []) if (matchesSearch(search, [i.note, i.mvr_laari])) add(i.received_at, { kind: 'income', id: i.id });
    for (const e of shared ?? []) if ((filter === 'all' || (filter === 'income') === (e.kind === 'income')) && (!category || e.category_id === category) && matchesSearch(search, [e.merchant, e.note, cat(e.category_id), e.mvr_laari])) add(e.entry_date, { kind: 'shared', id: e.id });
    return [...groups].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filter, search, category, expenses, income, shared, byId, catName]);
  const sharedById = useMemo(() => new Map((shared ?? []).map((e) => [e.id, e])), [shared]);
  const expenseById = useMemo(() => new Map((expenses ?? []).map((e) => [e.id, e])), [expenses]);
  const incomeById = useMemo(() => new Map((income ?? []).map((i) => [i.id, i])), [income]);
  // The numbers behind the day headers, and the category chips above the list (this month's biggest spending first).
  const sharedByIdAll = useMemo(() => new Map((shared ?? []).map((e) => [e.id, e])), [shared]);
  const dayTotals = useMemo(() => {
    const entries: { date: string; kind: 'expense' | 'income'; laari: number }[] = [];
    for (const [day, rows] of days) for (const r of rows) {
      if (r.kind === 'expense') { const e = (expenses ?? []).find((x) => x.id === r.id); if (e) entries.push({ date: day, kind: 'expense', laari: e.mvr_laari }); }
      else if (r.kind === 'income') { const i = (income ?? []).find((x) => x.id === r.id); if (i) entries.push({ date: day, kind: 'income', laari: i.mvr_laari }); }
      else { const e = sharedByIdAll.get(r.id); if (e) entries.push({ date: day, kind: e.kind === 'income' ? 'income' : 'expense', laari: e.mvr_laari }); }
    }
    return totalsByDay(entries);
  }, [days, expenses, income, sharedByIdAll]);
  const chipIds = useMemo(() => {
    const ids = categoryChips([...(expenses ?? []).map((e) => ({ category_id: e.category_id, laari: e.mvr_laari })), ...(shared ?? []).filter((e) => e.kind === 'expense').map((e) => ({ category_id: e.category_id, laari: e.mvr_laari }))]);
    return category && !ids.includes(category) ? [category, ...ids] : ids;
  }, [expenses, shared, category]);
  const dayLabel = (d: string) => (d === today() ? t('common.today') : d === addDays(today(), -1) ? t('common.yesterday') : null);

  return (
    <Screen onRefresh={refresh}>
      <StackHeader title={t('activity.title')} />
      <>
        <Segmented<Filter> value={filter} onChange={setFilter}
          options={[{ key: 'all', label: t('activity.all') }, { key: 'income', label: t('activity.income') }, { key: 'expenses', label: t('activity.expenses') }]} />
        <Field label={t('activity.search')} value={search} onChangeText={setSearch} placeholder={t('activity.searchHint')} autoCorrect={false} returnKeyType="search" />
        {chipIds.length > 1 && filter !== 'income' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
            <Chip label={t('activity.allCategories')} selected={category === null} onPress={() => setCategory(null)} />
            {chipIds.map((id) => { const c = byId.get(id); return c ? <Chip key={id} label={catName(c)} selected={category === id} onPress={() => setCategory(category === id ? null : id)} /> : null; })}
          </ScrollView>
        ) : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon={'chevron-back'} label={t('reports.prev')} onPress={() => setMonth(addMonths(month, -1))} />
          <Text variant="heading" accessibilityLiveRegion="polite">{(t('months', { returnObjects: true }) as string[])[Number(month.slice(5, 7)) - 1]} <Text latin variant="heading">{month.slice(0, 4)}</Text></Text>
          <IconButton icon={'chevron-forward'} label={t('reports.next')} disabled={month >= monthStart()} onPress={() => setMonth(addMonths(month, 1))} />
        </Row>
        {days.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: space.xl }}><Text color={colors.inkMuted}>{t(search.trim() ? 'activity.searchEmpty' : 'activity.empty')}</Text></Card>
        ) : days.map(([day, rows]) => (
          <View key={day} style={{ gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="label" color={colors.inkMuted}>{dayLabel(day) ?? <Text latin variant="label" color={colors.inkMuted}>{formatDate(day)}</Text>}</Text>
              {(() => {
                const tot = dayTotals.get(day);
                if (!tot) return null;
                return tot.spent > 0 ? <Msg k="activity.daySpent" amounts={{ amount: tot.spent }} variant="small" color={colors.inkMuted} /> : tot.received > 0 ? <Msg k="activity.dayReceived" amounts={{ amount: tot.received }} variant="small" color={colors.income} /> : null;
              })()}
            </Row>
            <Card>
              {rows.map((r) => {
                if (r.kind === 'shared') {
                  const e = sharedById.get(r.id);
                  return e ? <SharedRow key={r.id} hideDate entry={e} category={e.category_id ? byId.get(e.category_id) : undefined} /> : null;
                }
                if (r.kind === 'expense') {
                  const e = expenseById.get(r.id);
                  return e ? <ExpenseRow key={r.id} hideDate expense={e} category={e.category_id ? byId.get(e.category_id) : undefined} /> : null;
                }
                const i = incomeById.get(r.id);
                if (!i) return null;
                return (
                  <Pressable key={r.id} accessibilityRole="button" accessibilityHint={t('edit.tapToEdit')} onPress={() => router.push({ pathname: '/edit-income', params: { id: r.id } })}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="arrow-down" color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1}>{i.note || t('add.income')}</Text>
                      {i.currency !== 'MVR' ? <Text latin variant="small" color={colors.inkMuted}>{money(i.amount_laari, i.currency)}</Text> : null}
                    </View>
                    <Money laari={i.mvr_laari} prefix="+" color={colors.income} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))}
      </>
    </Screen>
  );
}
