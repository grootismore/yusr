import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Row, Screen } from '@/components/ui';
import { DateField } from '@/components/DateField';
import * as api from '@/data/api';
import { useCategories, useCategoryName, useRecurring, useWrite } from '@/data/hooks';
import { useShare } from '@/features/household/useShare';
import { EVERY, type Every, type RecurringInput } from '@/features/recurring/logic';
import { formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** Add or change something that repeats, or stop it. */
export default function RecurringEdit() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const catName = useCategoryName();
  const { id, fromKind, fromId, name: pName, amount: pAmount, currency: pCurrency, category: pCategory, date: pDate } = useLocalSearchParams<{ id?: string; fromKind?: 'expense' | 'income'; fromId?: string; name?: string; amount?: string; currency?: string; category?: string; date?: string }>();
  const existing = useRecurring().data?.find((r) => r.id === id);
  const categories = useCategories().data ?? [];
  const add = useWrite(api.addRecurring);
  const update = useWrite(api.updateRecurring);
  const stop = useWrite(api.endRecurring);
  const link = useWrite(api.linkRecurringRun);
  // Opened from an expense or income already recorded: start from it, and count it as the first date.
  const from = !existing && fromId && fromKind ? { kind: fromKind, id: fromId } : null;
  const share = useShare(existing);
  const [kind, setKind] = useState<'expense' | 'income'>(existing?.kind ?? from?.kind ?? 'expense');
  const [name, setName] = useState(existing?.name ?? pName ?? '');
  const [amount, setAmount] = useState(existing ? formatNumber(existing.amount_minor).replace(/,/g, '') : pAmount ? formatNumber(Number(pAmount)).replace(/,/g, '') : '');
  const [currency, setCurrency] = useState(existing?.currency ?? pCurrency ?? 'MVR');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? pCategory ?? null);
  const [every, setEvery] = useState<Every>(existing?.every ?? 'month');
  const [start, setStart] = useState(formatDate(existing?.starts_on ?? pDate ?? today()));
  const [auto, setAuto] = useState(existing?.auto_add ?? kind === 'expense');
  const [note, setNote] = useState(existing?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('recurring.needName');
    let minor = 0;
    try { minor = parseAmount(amount); if (minor <= 0) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    const iso = parseDate(start);
    if (!iso) e.start = t('expense.invalidDate');
    setErrors(e);
    if (Object.keys(e).length) return;
    const input: RecurringInput = { kind, name: name.trim(), note: note.trim() || null, amount_minor: minor, currency, category_id: kind === 'expense' ? categoryId : null, every, starts_on: iso!, auto_add: auto, household_id: share.householdId, for_user: share.forUser };
    if (existing) await update.mutateAsync({ id: existing.id, input }); else {
      const newId = Crypto.randomUUID();
      await add.mutateAsync({ id: newId, input });
      if (from && iso === pDate) await link.mutateAsync({ recurring_id: newId, occurrence: iso, ...(from.kind === 'expense' ? { expense_id: from.id } : { income_id: from.id }) });
    }
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{existing ? t('recurring.editTitle') : t('recurring.addTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      {!existing && !from ? (
        <Row>
          {(['expense', 'income'] as const).map((k) => <Chip key={k} label={t(`recurring.kindOne.${k}`)} selected={kind === k} onPress={() => { setKind(k); setAuto(k === 'expense'); }} />)}
        </Row>
      ) : null}
      <Field label={t('recurring.name')} hint={t(`recurring.nameHint.${kind}`)} value={name} onChangeText={setName} maxLength={100} error={errors.name} autoCapitalize="words" />
      <Field label={`${t('expense.amount')} (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 24 }} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('recurring.currency')}</Text>
        <Row>{CURRENCIES.map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}</Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('recurring.repeats')}</Text>
        <Row>{EVERY.map((v) => <Chip key={v} label={t(`recurring.every.${v}`)} selected={every === v} onPress={() => setEvery(v)} />)}</Row>
      </View>
      <DateField label={t('recurring.starts')} hint={t('recurring.startsHint')} value={start} onChangeText={setStart} error={errors.start} />
      {kind === 'expense' ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">{t('expense.category')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>{categories.map((c) => <Chip key={c.id} label={catName(c)} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} />)}</Row>
        </View>
      ) : null}
      <Card>
        <Row style={{ minHeight: 52 }}>
          <View style={{ flex: 1 }}>
            <Text>{t('recurring.autoAdd')}</Text>
            <Text variant="small" color={colors.inkMuted}>{t(`recurring.autoNote.${kind}`)}</Text>
          </View>
          <Switch accessibilityLabel={t('recurring.autoAdd')} value={auto} onValueChange={setAuto} trackColor={{ true: colors.accent, false: colors.control }} />
        </Row>
      </Card>
      {share.row}
      {share.people}
      <Field label={`${t('commit.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} maxLength={200} />
      <Button label={t('common.save')} onPress={submit} loading={add.isPending || update.isPending} />
      {existing ? (
        <Button kind="danger" label={t('recurring.stop')}
          onPress={() => Alert.alert(t('recurring.stopTitle'), t('recurring.stopBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('recurring.stop'), style: 'destructive', onPress: async () => { await stop.mutateAsync(existing.id); toast(t('recurring.stopped')); router.back(); } },
          ])} />
      ) : null}
    </Screen>
  );
}
