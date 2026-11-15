import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Chip, Field, Row, Screen } from '@/components/ui';
import { DateField } from '@/components/DateField';
import * as api from '@/data/api';
import { useSplit, useWrite } from '@/data/hooks';
import { SPLIT_TYPES, computeShares, meOf, type SplitType } from '@/features/split/logic';
import { formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, money, parseAmount } from '@/lib/money';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** Add a cost to a group: what, how much, who paid, and how it is divided. */
export default function SplitExpense() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { group } = useLocalSearchParams<{ group: string }>();
  const data = useSplit().data;
  const g = data?.groups.find((x) => x.id === group);
  const people = useMemo(() => (data?.people ?? []).filter((p) => p.group_id === group), [data, group]);
  const add = useWrite(api.addSplitExpense);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [type, setType] = useState<SplitType>('equal');
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(formatDate(today()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!g) return <Screen><Text color={colors.inkMuted}>{t('common.loading')}</Text></Screen>;
  const payer = paidBy ?? meOf(people)?.id ?? people[0]?.id;
  const isIn = (id: string) => included[id] ?? true;
  const parts = people.filter((p) => isIn(p.id));
  let total = 0;
  try { total = amount.trim() ? parseAmount(amount) : 0; } catch { total = 0; }

  // What each person's box means: an amount, a percent, or a number of shares. Blank counts as nothing (for equal, it is ignored).
  const raw: Record<string, number> = {};
  for (const p of parts) {
    const text = values[p.id]?.trim() ?? '';
    try { raw[p.id] = type === 'equal' ? 0 : type === 'shares' ? Number(text || '0') : text ? parseAmount(text) : 0; } catch { raw[p.id] = NaN; }
  }
  const result = total > 0 && parts.length > 0 && !Object.values(raw).some(Number.isNaN) ? computeShares(total, type, raw) : null;
  const left = type === 'exact' ? total - Object.values(raw).reduce((s, v) => s + (v || 0), 0) : type === 'percent' ? 10_000 - Object.values(raw).reduce((s, v) => s + (v || 0), 0) : 0;

  async function submit() {
    const iso = parseDate(date);
    if (!description.trim()) { setError(t('split.needDescription')); return; }
    if (total <= 0) { setError(t('expense.invalidAmount')); return; }
    if (!iso) { setError(t('expense.invalidDate')); return; }
    if (!result || !result.ok) { setError(t(result && !result.ok && result.error === 'nobody' ? 'split.needPeople' : 'split.sumWrong')); return; }
    setError(null);
    await add.mutateAsync({ group_id: g!.id, description: description.trim(), amount_minor: total, paid_by: payer, split_type: type, spent_on: iso, note: note.trim() || null, shares: result.shares } as Parameters<typeof api.addSplitExpense>[0]);
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('split.addExpense')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Field label={t('split.description')} hint={t('split.descriptionHint')} value={description} onChangeText={setDescription} maxLength={100} autoCapitalize="sentences" />
      <Field label={`${t('expense.amount')} (${g.currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" style={{ fontSize: 24 }} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('split.paidBy')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{people.map((p) => <Chip key={p.id} label={p.name} selected={payer === p.id} onPress={() => setPaidBy(p.id)} />)}</Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('split.splitHow')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{SPLIT_TYPES.map((s) => <Chip key={s} label={t(`split.type.${s}`)} selected={type === s} onPress={() => setType(s)} />)}</Row>
        <Text variant="small" color={colors.inkMuted}>{t(`split.typeHint.${type}`)}</Text>
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('split.between')}</Text>
        {people.map((p) => (
          <Row key={p.id} style={{ minHeight: 52 }}>
            <Chip label={p.name} selected={isIn(p.id)} icon={isIn(p.id) ? 'checkmark' : undefined} onPress={() => setIncluded({ ...included, [p.id]: !isIn(p.id) })} />
            <View style={{ flex: 1 }} />
            {isIn(p.id) && type !== 'equal' ? (
              <View style={{ width: 120 }}>
                <Field label="" value={values[p.id] ?? ''} onChangeText={(v) => setValues({ ...values, [p.id]: v })} keyboardType={type === 'shares' ? 'number-pad' : 'decimal-pad'} placeholder={type === 'percent' ? '%' : type === 'shares' ? '1' : '0.00'} />
              </View>
            ) : isIn(p.id) && result?.ok ? <Text latin>{money(result.shares[p.id] ?? 0, g.currency)}</Text> : null}
          </Row>
        ))}
        {type === 'exact' && total > 0 ? <Text variant="small" color={left === 0 ? colors.inkMuted : colors.coral}>{left === 0 ? t('split.allAssigned') : t('split.leftToAssign', { amount: money(left, g.currency) })}</Text> : null}
        {type === 'percent' ? <Text variant="small" color={left === 0 ? colors.inkMuted : colors.coral}>{left === 0 ? t('split.allAssigned') : t('split.percentLeft', { percent: formatNumber(left) })}</Text> : null}
        {type !== 'exact' && result?.ok && type !== 'equal' ? <Text variant="small" color={colors.inkMuted}>{parts.map((p) => `${p.name} ${money(result.shares[p.id] ?? 0, g.currency)}`).join(' · ')}</Text> : null}
      </View>
      <DateField label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={setDate} />
      <Field label={`${t('expense.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} maxLength={300} />
      {error ? <Text color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button label={t('common.save')} onPress={submit} loading={add.isPending} />
    </Screen>
  );
}
