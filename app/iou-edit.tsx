import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Text } from '@/components/Text';
import { Button, Field, Row, Screen, Segmented, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useIous, useWrite } from '@/data/hooks';
import type { Direction, IouInput, Nudge } from '@/features/ious/logic';
import { requestNotificationPermission } from '@/features/giving/reminders';
import { formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Add an IOU, or change one you made. */
export default function IouEdit() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useIous().data?.find((i) => i.id === id);
  const add = useWrite(api.addIou);
  const update = useWrite(api.updateIou);
  const [direction, setDirection] = useState<Direction>(existing?.direction ?? 'lent');
  const [name, setName] = useState(existing?.person_name ?? '');
  const [email, setEmail] = useState(existing?.person_email ?? '');
  const [amount, setAmount] = useState(existing ? formatNumber(existing.amount_laari).replace(/,/g, '') : '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [lentOn, setLentOn] = useState(formatDate(existing?.lent_on ?? today()));
  const [dueOn, setDueOn] = useState(existing?.due_on ? formatDate(existing.due_on) : '');
  const [nudge, setNudge] = useState<Nudge>(existing?.nudge ?? 'me');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canBoth = direction === 'lent';
  const shownNudge: Nudge = nudge === 'both' && !canBoth ? 'me' : nudge;

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('ious.needName');
    if (email.trim() && !EMAIL.test(email.trim())) e.email = t('split.invalidEmail');
    let laari = 0;
    try { laari = parseAmount(amount); if (laari <= 0) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    const lent = parseDate(lentOn);
    if (!lent) e.lentOn = t('expense.invalidDate');
    const due = dueOn.trim() ? parseDate(dueOn) : null;
    if (dueOn.trim() && !due) e.dueOn = t('expense.invalidDate');
    if (shownNudge === 'both' && !EMAIL.test(email.trim())) e.email = t('ious.needEmailForBoth');
    setErrors(e);
    if (Object.keys(e).length) return;
    const input: IouInput = { direction, person_name: name.trim(), person_email: email.trim() ? email.trim().toLowerCase() : null, title: title.trim() || null, amount_laari: laari, lent_on: lent!, due_on: due, nudge: shownNudge };
    if (existing) await update.mutateAsync({ id: existing.id, input }); else await add.mutateAsync({ input });
    if (shownNudge !== 'off') void requestNotificationPermission();
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <StackHeader title={existing ? t('ious.editTitle') : t('ious.addTitle')} />
      <Segmented<Direction> value={direction} onChange={setDirection} options={[{ key: 'lent', label: t('ious.dir.lent') }, { key: 'borrowed', label: t('ious.dir.borrowed') }]} />
      <Field label={t(direction === 'lent' ? 'ious.whoLent' : 'ious.whoBorrowed')} value={name} onChangeText={setName} maxLength={80} error={errors.name} autoCapitalize="words" />
      <Field label={`${t('ious.email')} (${t('common.optional')})`} hint={t('ious.emailHint')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={120} error={errors.email} />
      <Field label={`${t('ious.amount')} (MVR)`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 24 }} />
      <Field label={`${t('ious.what')} (${t('common.optional')})`} hint={t('ious.whatHint')} value={title} onChangeText={setTitle} maxLength={120} />
      <DateField label={t('ious.date')} value={lentOn} onChangeText={setLentOn} error={errors.lentOn} />
      <DateField label={`${t('ious.dueOn')} (${t('common.optional')})`} value={dueOn} onChangeText={setDueOn} error={errors.dueOn} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('ious.nudge.title')}</Text>
        <Segmented<Nudge> value={shownNudge} onChange={setNudge} options={[{ key: 'off', label: t('ious.nudge.off') }, { key: 'me', label: t('ious.nudge.me') }, ...(canBoth ? [{ key: 'both' as const, label: t('ious.nudge.both') }] : [])]} />
        <Text variant="small" color={colors.inkMuted}>{t(`ious.nudge.${shownNudge}Note`, { name: name.trim() || t('ious.other') })}</Text>
        {!canBoth ? <Text variant="small" color={colors.inkMuted}>{t('ious.nudge.bothOnlyLent')}</Text> : null}
      </View>
      <Row>
        <Button label={t('common.save')} onPress={submit} loading={add.isPending || update.isPending} style={{ flex: 1 }} />
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
    </Screen>
  );
}
