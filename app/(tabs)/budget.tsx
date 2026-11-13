import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, ProgressBar, Row, Screen, ScreenTitle, type IconName } from '@/components/ui';
import * as api from '@/data/api';
import { useBudgets, useCategories, useCategoryName, useExpenses, useWrite } from '@/data/hooks';
import { budgetState, percentUsed } from '@/lib/budget';
import { monthStart } from '@/lib/dates';
import { formatNumber, parseAmount } from '@/lib/money';
import { radius, space, useColors } from '@/theme/tokens';

/** Edit one limit in place: a field, Save, and Remove when a limit exists. */
function LimitEditor({ categoryId, limit, onDone }: { categoryId: string | null; limit?: number; onDone: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState(limit ? formatNumber(limit).replace(/,/g, '') : '');
  const [error, setError] = useState<string | null>(null);
  const save = useWrite((l: number) => api.setBudget(monthStart(), categoryId, l));
  const clear = useWrite(() => api.clearBudget(categoryId));
  async function submit() {
    try {
      const l = parseAmount(text);
      if (l <= 0) throw new Error('x');
      await save.mutateAsync(l);
      onDone();
    } catch { setError(t('expense.invalidAmount')); }
  }
  return (
    <View style={{ gap: space.sm }}>
      <Field label={t('budget.limit')} value={text} onChangeText={(v) => { setText(v); setError(null); }} keyboardType="decimal-pad" placeholder="0.00" error={error} />
      <Row style={{ flexWrap: 'wrap' }}>
        <Button label={t('common.save')} onPress={submit} loading={save.isPending} />
        {limit ? <Button kind="ghost" label={t('budget.clear')} onPress={async () => { await clear.mutateAsync(undefined); onDone(); }} /> : null}
      </Row>
    </View>
  );
}

function LimitRow({ title, icon, categoryId, limit, spent, last }: { title: string; icon: IconName; categoryId: string; limit?: number; spent: number; last?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const state = budgetState(spent, limit);
  return (
    <View style={{ gap: space.sm, paddingVertical: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <Row style={{ minHeight: 52 }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text>{title}</Text>
          {limit
            ? <Text latin variant="small" color={colors.inkMuted} style={{ writingDirection: 'ltr' }}>MVR {formatNumber(spent)} / {formatNumber(limit)}</Text>
            : <Text variant="small" color={colors.inkMuted}>{t('budget.noLimit')}</Text>}
        </View>
        <Button kind={limit ? 'ghost' : 'secondary'} label={limit ? t('common.edit') : t('budget.setLimit')} onPress={() => setEditing(!editing)} style={limit ? undefined : { minHeight: 44, paddingHorizontal: space.lg }} />
      </Row>
      {limit ? <ProgressBar percent={percentUsed(spent, limit)} state={state === 'none' ? 'ok' : state} label={t('a11y.progress', { percent: percentUsed(spent, limit) })} /> : null}
      {limit && state !== 'ok' && state !== 'none' ? (
        <Row>
          <Icon name={state === 'over' ? 'alert-circle' : 'warning'} size={18} color={state === 'over' ? colors.coral : colors.amberDeep} />
          <Text variant="small" color={state === 'over' ? colors.coral : colors.ink}>{t(state === 'over' ? 'budget.over' : 'reports.nearLimit')}</Text>
        </Row>
      ) : null}
      {editing ? <LimitEditor categoryId={categoryId} limit={limit} onDone={() => setEditing(false)} /> : null}
    </View>
  );
}

export default function Budget() {
  const colors = useColors();
  const { t } = useTranslation();
  const catName = useCategoryName();
  const month = monthStart();
  const limits = useBudgets(month).data;
  const categories = useCategories().data ?? [];
  const expenses = useExpenses(month).data;
  const [editingAll, setEditingAll] = useState(false);
  const spentBy = useMemo(() => {
    const m = new Map<string | null, number>();
    for (const e of expenses ?? []) m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.mvr_laari);
    return m;
  }, [expenses]);
  const total = (expenses ?? []).reduce((s, e) => s + e.mvr_laari, 0);
  const overall = limits?.get(null);
  const state = budgetState(total, overall);

  return (
    <Screen tabbed>
      <ScreenTitle title={t('budget.title')} />
      <Card tone="hero" style={{ gap: space.md, padding: space.xl }}>
        <Text color={colors.onHero}>{t('budget.overall')}</Text>
        {overall ? <Money laari={overall} variant="display" color={colors.onHero} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 40, lineHeight: 52 }} /> : <Text variant="title" color={colors.onHero}>{t('budget.noLimit')}</Text>}
        {overall ? (
          <>
            <ProgressBar onHero percent={percentUsed(total, overall)} state={state === 'none' ? 'ok' : state} label={t('a11y.progress', { percent: percentUsed(total, overall) })} />
            {state === 'over'
              ? <Msg k="reports.overBy" amounts={{ amount: total - overall }} color={colors.onHero} />
              : <Msg k="reports.leftOf" amounts={{ amount: overall - total, limit: overall }} color={colors.onHero} />}
          </>
        ) : null}
        <Button kind="secondary" label={overall ? t('common.edit') : t('budget.setLimit')} onPress={() => setEditingAll(!editingAll)} style={{ backgroundColor: colors.sun, borderColor: colors.sun, alignSelf: 'flex-start' }} textColor={colors.onTile} />
        {editingAll ? <LimitEditor categoryId={null} limit={overall} onDone={() => setEditingAll(false)} /> : null}
      </Card>

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        {categories.map((c, i) => (
          <LimitRow key={c.id} title={catName(c)} icon={c.icon as IconName} categoryId={c.id} limit={limits?.get(c.id)} spent={spentBy.get(c.id) ?? 0} last={i === categories.length - 1} />
        ))}
      </Card>
      <Text variant="small" color={colors.inkMuted}>{t('budget.hint')}</Text>
    </Screen>
  );
}
