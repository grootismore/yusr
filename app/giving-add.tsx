import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite } from '@/data/hooks';
import { GIVING_KINDS, type GivingKind } from '@/features/giving/logic';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { parseAmount } from '@/lib/money';
import { space } from '@/theme/tokens';

export default function GivingAdd() {
  const { t } = useTranslation();
  const router = useRouter();
  const log = useWrite(api.logGiving);
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<GivingKind>('sadaqah');
  const [date, setDate] = useState(formatDate(today()));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});

  async function submit() {
    const e: typeof errors = {};
    let laari = 0;
    try { laari = parseAmount(amount); if (laari <= 0) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    const iso = parseDate(date);
    if (!iso) e.date = t('expense.invalidDate');
    setErrors(e);
    if (Object.keys(e).length) return;
    await log.mutateAsync({ amount_laari: laari, kind, spent_at: iso!, recipient_note: note.trim() || null });
    success();
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('giving.logTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Field label={t('expense.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 24 }} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('giving.type')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{GIVING_KINDS.map((k) => <Chip key={k} label={t(`giving.kind.${k}`)} selected={kind === k} onPress={() => setKind(k)} />)}</Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Field label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" error={errors.date} />
        <Row>
          <Chip label={t('common.today')} onPress={() => setDate(formatDate(today()))} />
          <Chip label={t('common.yesterday')} onPress={() => setDate(formatDate(addDays(today(), -1)))} />
        </Row>
      </View>
      <Field label={`${t('giving.recipient')} (${t('common.optional')})`} hint={t('giving.recipientHint')} value={note} onChangeText={setNote} maxLength={200} />
      <Button label={t('common.save')} onPress={submit} loading={log.isPending} />
    </Screen>
  );
}
