import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ExpenseRow } from '@/components/ExpenseRow';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Card, HeaderBand, Icon, IconButton, Row, Screen, Segmented } from '@/components/ui';
import { useCategories, useExpenses, useIncome } from '@/data/hooks';
import { addDays, addMonths, formatDate, monthStart, today } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';

type Filter = 'all' | 'income' | 'expenses';

/** Everything that moved in a month, newest day first, with All / Income / Expenses tabs. */
export default function Activity() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(monthStart());
  const expenses = useExpenses(month).data;
  const income = useIncome(month).data;
  const cats = useCategories().data;
  const byId = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c])), [cats]);
  const rtl = i18n.language === 'dv';

  const days = useMemo(() => {
    const groups = new Map<string, { kind: 'expense' | 'income'; id: string }[]>();
    const add = (date: string, row: { kind: 'expense' | 'income'; id: string }) => groups.set(date, [...(groups.get(date) ?? []), row]);
    if (filter !== 'income') for (const e of expenses ?? []) add(e.spent_at, { kind: 'expense', id: e.id });
    if (filter !== 'expenses') for (const i of income ?? []) add(i.received_at, { kind: 'income', id: i.id });
    return [...groups].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filter, expenses, income]);
  const expenseById = useMemo(() => new Map((expenses ?? []).map((e) => [e.id, e])), [expenses]);
  const incomeById = useMemo(() => new Map((income ?? []).map((i) => [i.id, i])), [income]);
  const dayLabel = (d: string) => (d === today() ? t('common.today') : d === addDays(today(), -1) ? t('common.yesterday') : null);

  return (
    <Screen padded={false} bleed>
      <HeaderBand onBack title={t('activity.title')} />
      <View style={{ paddingHorizontal: space.lg, gap: space.lg, marginTop: -space.xl }}>
        <Segmented<Filter> value={filter} onChange={setFilter}
          options={[{ key: 'all', label: t('activity.all') }, { key: 'income', label: t('activity.income') }, { key: 'expenses', label: t('activity.expenses') }]} />
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon={rtl ? 'chevron-forward' : 'chevron-back'} label={t('reports.prev')} onPress={() => setMonth(addMonths(month, -1))} />
          <Text variant="heading" accessibilityLiveRegion="polite">{(t('months', { returnObjects: true }) as string[])[Number(month.slice(5, 7)) - 1]} <Text latin variant="heading">{month.slice(0, 4)}</Text></Text>
          <IconButton icon={rtl ? 'chevron-back' : 'chevron-forward'} label={t('reports.next')} disabled={month >= monthStart()} onPress={() => setMonth(addMonths(month, 1))} />
        </Row>
        {days.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: space.xl }}><Text color={colors.inkMuted}>{t('activity.empty')}</Text></Card>
        ) : days.map(([day, rows]) => (
          <View key={day} style={{ gap: space.sm }}>
            <Text variant="label" color={colors.inkMuted}>{dayLabel(day) ?? <Text latin variant="label" color={colors.inkMuted}>{formatDate(day)}</Text>}</Text>
            <Card>
              {rows.map((r) => {
                if (r.kind === 'expense') {
                  const e = expenseById.get(r.id);
                  return e ? <ExpenseRow key={r.id} hideDate expense={e} category={e.category_id ? byId.get(e.category_id) : undefined} /> : null;
                }
                const i = incomeById.get(r.id);
                if (!i) return null;
                return (
                  <Row key={r.id} style={{ minHeight: 56 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="arrow-down" color={colors.teal} />
                    </View>
                    <Text numberOfLines={1} style={{ flex: 1 }}>{i.note || t('add.income')}</Text>
                    <Money laari={i.mvr_laari} prefix="+" color={colors.teal} />
                  </Row>
                );
              })}
            </Card>
          </View>
        ))}
      </View>
    </Screen>
  );
}
