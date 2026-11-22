import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { confirmDialog } from '@/lib/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useRegisterItems, useWrite } from '@/data/hooks';
import { REGISTER_KINDS, type RegisterKind } from '@/features/register/types';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';
import { toast } from '@/lib/toast';

export default function RegisterItemScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const item = useRegisterItems().data?.find((i) => i.id === id);
  const save = useWrite(api.saveRegisterItem);
  const remove = useWrite(api.deleteRegisterItem);

  const [kind, setKind] = useState<RegisterKind>(item?.kind ?? 'debt');
  const [title, setTitle] = useState(item?.title ?? '');
  const [who, setWho] = useState(item?.counterparty ?? '');
  const [amount, setAmount] = useState(item?.amount_laari ? formatNumber(item.amount_laari).replace(/,/g, '') : '');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  // Details are encrypted at rest and fetched separately, only for the owner.
  useEffect(() => {
    if (!id) return;
    let live = true;
    void api.getRegisterDetails(id).then((d) => { if (live) setDetails(d); });
    return () => { live = false; };
  }, [id]);

  async function submit() {
    const e: typeof errors = {};
    if (!title.trim()) e.title = t('register.needTitle');
    let laari: number | null = null;
    if (amount.trim()) { try { laari = parseAmount(amount); } catch { e.amount = t('expense.invalidAmount'); } }
    setErrors(e);
    if (Object.keys(e).length) return;
    await save.mutateAsync({ id, kind, title: title.trim(), counterparty: who.trim() || null, amount_laari: laari, details: details.trim() });
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t('register.itemTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <View style={{ gap: space.sm }}>
        <Row style={{ flexWrap: 'wrap' }}>{REGISTER_KINDS.map((k) => <Chip key={k} label={t(`register.kind.${k}`)} selected={kind === k} onPress={() => setKind(k)} />)}</Row>
      </View>
      <Field label={t('register.itemTitleLabel')} value={title} onChangeText={setTitle} error={errors.title} maxLength={120} />
      <Field label={`${t('register.counterparty')} (${t('common.optional')})`} value={who} onChangeText={setWho} maxLength={120} />
      <Field label={`${t('register.amount')} (${t('common.optional')})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
      <Field label={`${t('register.details')} (${t('common.optional')})`} hint={t('register.detailsHint')} value={details} onChangeText={setDetails} multiline maxLength={2000} />
      <Button label={t('common.save')} onPress={submit} loading={save.isPending} />
      {id ? (
        <Button kind="ghost" label={t('common.remove')} busyLabel={t('common.deleting')} icon="trash-outline"
          onPress={async () => { if (await confirmDialog({ title: t('register.deleteTitle'), confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), destructive: true })) { await remove.mutateAsync(id); toast(t('toast.deleted')); router.back(); } }} />
      ) : null}
      <Text variant="small" color={colors.inkMuted}>{t('register.honest')}</Text>
    </Screen>
  );
}
