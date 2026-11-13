import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, Row, Screen, ScreenTitle, type IconName } from '@/components/ui';
import * as api from '@/data/api';
import { useBudgets, useCategories, useCategoryName, useWrite } from '@/data/hooks';
import { monthStart } from '@/lib/dates';
import { formatNumber, parseAmount } from '@/lib/money';
import { radius, space, useColors } from '@/theme/tokens';

function LimitRow({ title, icon, categoryId, limit }: { title: string; icon: IconName; categoryId: string | null; limit?: number }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useWrite((l: number) => api.setBudget(monthStart(), categoryId, l));
  const clear = useWrite(() => api.clearBudget(categoryId));

  async function submit() {
    try {
      const l = parseAmount(text);
      if (l <= 0) throw new Error('x');
      await save.mutateAsync(l);
      setEditing(false); setError(null);
    } catch { setError(t('expense.invalidAmount')); }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ minHeight: 56 }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text>{title}</Text>
          {limit ? <Money laari={limit} color={colors.inkMuted} variant="small" /> : <Text variant="small" color={colors.inkMuted}>{t('budget.noLimit')}</Text>}
        </View>
        <Button kind="ghost" label={limit ? t('common.edit') : t('budget.setLimit')} onPress={() => { setText(limit ? formatNumber(limit).replace(/,/g, '') : ''); setEditing(!editing); }} />
      </Row>
      {editing ? (
        <View style={{ gap: space.sm }}>
          <Field label={t('budget.limit')} value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="0.00" error={error} />
          <Row style={{ flexWrap: 'wrap' }}>
            <Button label={t('common.save')} onPress={submit} loading={save.isPending} />
            {limit ? <Button kind="ghost" label={t('budget.clear')} onPress={async () => { await clear.mutateAsync(undefined); setEditing(false); }} /> : null}
          </Row>
        </View>
      ) : null}
    </View>
  );
}

export default function Budget() {
  const { t } = useTranslation();
  const catName = useCategoryName();
  const limits = useBudgets(monthStart()).data;
  const categories = useCategories().data ?? [];
  return (
    <Screen tabbed>
      <ScreenTitle title={t('budget.title')} subtitle={t('budget.hint')} />
      <Card>
        <LimitRow title={t('budget.overall')} icon="calendar" categoryId={null} limit={limits?.get(null)} />
      </Card>
      <Card>
        {categories.map((c) => <LimitRow key={c.id} title={catName(c)} icon={c.icon as IconName} categoryId={c.id} limit={limits?.get(c.id)} />)}
      </Card>
    </Screen>
  );
}
