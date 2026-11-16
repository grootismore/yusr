import { useState } from 'react';
import { View } from 'react-native';
import { confirmDialog } from '@/lib/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useCommitments, useWrite } from '@/data/hooks';
import { useShare } from '@/features/household/useShare';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

const KINDS = ['sadaqah', 'jariyah'] as const;

/** Add or change a monthly gift, or stop it. It stays on the Giving screen until stopped. */
export default function GivingCommitment() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useCommitments().data?.find((c) => c.id === id);
  const save = useWrite(api.saveCommitment);
  const stop = useWrite(api.endCommitment);
  const [recipient, setRecipient] = useState(existing?.recipient ?? '');
  const [amount, setAmount] = useState(existing ? formatNumber(existing.amount_laari).replace(/,/g, '') : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [day, setDay] = useState(String(existing?.due_day ?? 1));
  const [kind, setKind] = useState<(typeof KINDS)[number]>(existing?.kind ?? 'sadaqah');
  const share = useShare(existing);
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string; day?: string }>({});

  async function submit() {
    const e: typeof errors = {};
    if (!recipient.trim()) e.recipient = t('commit.needRecipient');
    let laari = 0;
    try { laari = parseAmount(amount); if (laari <= 0) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    const d = Number(day);
    if (!Number.isInteger(d) || d < 1 || d > 28) e.day = t('commit.invalidDay');
    setErrors(e);
    if (Object.keys(e).length) return;
    await save.mutateAsync({ id: existing?.id, input: { recipient: recipient.trim(), note: note.trim() || null, amount_laari: laari, kind, due_day: d, household_id: share.householdId, for_user: share.forUser } });
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{existing ? t('commit.editTitle') : t('commit.addTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Text color={colors.inkMuted}>{t('commit.intro')}</Text>
      <Field label={t('commit.recipient')} hint={t('commit.recipientHint')} value={recipient} onChangeText={setRecipient} maxLength={100} error={errors.recipient} />
      <Field label={t('commit.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 24 }} />
      <Field label={`${t('commit.note')} (${t('common.optional')})`} hint={t('commit.noteHint')} value={note} onChangeText={setNote} maxLength={200} />
      <Field label={t('commit.day')} hint={t('commit.dayHint')} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} error={errors.day} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('giving.type')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{KINDS.map((k) => <Chip key={k} label={t(`giving.kind.${k}`)} selected={kind === k} onPress={() => setKind(k)} />)}</Row>
      </View>
      {share.row}
      {share.people}
      <Button label={t('common.save')} onPress={submit} loading={save.isPending} />
      {existing ? (
        <Button kind="danger" label={t('commit.stop')}
          onPress={async () => { if (await confirmDialog({ title: t('commit.stopTitle'), message: t('commit.stopBody'), confirmLabel: t('commit.stop'), cancelLabel: t('common.cancel'), destructive: true })) { await stop.mutateAsync(existing.id); toast(t('commit.stopped')); router.back(); } }} />
      ) : null}
    </Screen>
  );
}
