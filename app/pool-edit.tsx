import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { usePools, useWrite } from '@/data/hooks';
import { useShare } from '@/features/household/useShare';
import type { PoolInput } from '@/features/pools/logic';
import { formatMonthInput, maskMonth, parseMonth } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** Add or change a money pool, or stop it. */
export default function PoolEdit() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = usePools().data?.find((p) => p.id === id);
  const add = useWrite(api.addPool);
  const update = useWrite(api.updatePool);
  const stop = useWrite(api.endPool);
  const share = useShare(existing);
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? formatNumber(existing.amount_minor).replace(/,/g, '') : '');
  const [currency, setCurrency] = useState(existing?.currency ?? 'MVR');
  const [day, setDay] = useState(String(existing?.due_day ?? 1));
  const [members, setMembers] = useState(existing?.members ? String(existing.members) : '');
  const [payout, setPayout] = useState(existing?.payout_month ? formatMonthInput(existing.payout_month) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('pools.needName');
    let minor = 0;
    try { minor = parseAmount(amount); if (minor <= 0) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    const d = Number(day);
    if (!Number.isInteger(d) || d < 1 || d > 28) e.day = t('commit.invalidDay');
    let count: number | null = null;
    if (members.trim()) { count = Number(members); if (!Number.isInteger(count) || count < 2 || count > 200) e.members = t('pools.invalidMembers'); }
    let month: string | null = null;
    if (payout.trim()) { month = parseMonth(payout); if (!month) e.payout = t('pools.invalidMonth'); }
    setErrors(e);
    if (Object.keys(e).length) return;
    const input: PoolInput = { name: name.trim(), note: note.trim() || null, amount_minor: minor, currency, due_day: d, members: count, payout_month: month, payout_received: existing?.payout_received ?? false, household_id: share.householdId };
    if (existing) await update.mutateAsync({ id: existing.id, input }); else await add.mutateAsync({ input });
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{existing ? t('pools.editTitle') : t('pools.addTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Text color={colors.inkMuted}>{t('pools.intro')}</Text>
      <Field label={t('pools.name')} hint={t('pools.nameHint')} value={name} onChangeText={setName} maxLength={100} error={errors.name} autoCapitalize="words" />
      <Field label={`${t('pools.amount')} (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 24 }} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('recurring.currency')}</Text>
        <Row>{CURRENCIES.map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}</Row>
      </View>
      <Field label={t('commit.day')} hint={t('commit.dayHint')} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} error={errors.day} />
      <Field label={`${t('pools.members')} (${t('common.optional')})`} hint={t('pools.membersHint')} value={members} onChangeText={setMembers} keyboardType="number-pad" maxLength={3} error={errors.members} />
      <Field label={`${t('pools.payout')} (${t('common.optional')})`} hint={t('pools.payoutHint')} value={payout} onChangeText={(v) => setPayout(maskMonth(v))} keyboardType="number-pad" maxLength={7} placeholder="MM/YYYY" error={errors.payout} />
      <Field label={`${t('commit.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} maxLength={200} />
      {share.row}
      <Button label={t('common.save')} onPress={submit} loading={add.isPending || update.isPending} />
      {existing ? (
        <Button kind="danger" label={t('pools.stop')}
          onPress={() => Alert.alert(t('pools.stopTitle'), t('pools.stopBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('pools.stop'), style: 'destructive', onPress: async () => { await stop.mutateAsync(existing.id); toast(t('pools.stopped')); router.back(); } },
          ])} />
      ) : null}
    </Screen>
  );
}
