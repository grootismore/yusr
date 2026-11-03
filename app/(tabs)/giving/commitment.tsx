import { useState } from 'react';
import { Switch } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Button, Chips, ErrorText, Field, Group, HeaderTextButton, Row, Screen } from '@/components/ui';
import { parsePositiveAmount, toInputText, useFormatDate } from '@/features/transactions/format';
import { useCommitments, useSaveCommitment, useSoftDelete } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';
import { COMMITMENT_TYPES, SCHEDULES, type CommitmentType, type Schedule } from '@/features/giving/types';
import { confirmAction } from '@/lib/confirm';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

export default function CommitmentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const formatDate = useFormatDate();
  const { all } = useCommitments();
  const existing = id ? all.find((c) => c.id === id) : undefined;
  const save = useSaveCommitment();
  const archive = useSoftDelete('commitments');

  const [type, setType] = useState<CommitmentType>(existing?.type ?? 'sadaqah');
  const [amount, setAmount] = useState(existing ? toInputText(existing.amount_laari) : '');
  const [schedule, setSchedule] = useState<Schedule>(existing?.schedule ?? 'weekly_friday');
  const [dueOn, setDueOn] = useState(existing?.due_on ?? toISODate(new Date()));
  const [dayOfMonth, setDayOfMonth] = useState(existing?.day_of_month ? String(existing.day_of_month) : '');
  const [recipient, setRecipient] = useState(existing?.recipient_note ?? '');
  const [reminder, setReminder] = useState(existing?.reminder_enabled ?? true);
  const [active, setActive] = useState(existing?.active ?? true);
  const [submitted, setSubmitted] = useState(false);

  if (id && !existing) return null;

  const amountLaari = parsePositiveAmount(amount);
  const day = dayOfMonth.trim() === '' ? null : Number(dayOfMonth);
  const dayOk = day !== null && Number.isInteger(day) && day >= 1 && day <= 31;
  const error =
    amountLaari === null ? t('debts.amountInvalid') : schedule === 'monthly' && !dayOk ? t('debts.dayInvalid') : null;

  function onSave() {
    setSubmitted(true);
    if (error || amountLaari === null) return;
    if (!claim()) return;
    save(
      {
        type,
        amount_laari: amountLaari,
        schedule,
        due_on: schedule === 'once' ? dueOn : null,
        day_of_month: schedule === 'monthly' ? day : null,
        recipient_note: recipient.trim() === '' ? null : recipient.trim(),
        reminder_enabled: reminder,
        active,
      },
      existing,
    );
    router.back();
  }

  function onArchive() {
    if (!existing) return;
    confirmAction({
      title: t('giving.archiveTitle'),
      message: t('giving.archiveBody'),
      confirmLabel: t('giving.archive'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
          archive(existing.id);
          router.back();
        },
    });
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: existing ? t('giving.editTitle') : t('giving.newTitle'),
          headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
        }}
      />
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      <Group title={t('giving.type')}>
        <Chips options={COMMITMENT_TYPES.map((value) => ({ value, label: t(`giving.types.${value}`) }))} value={type} onChange={setType} />
      </Group>
      <Group>
        <Field label={t('giving.amount')} latin value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      </Group>
      <Group title={t('giving.schedule')}>
        <Chips options={SCHEDULES.map((value) => ({ value, label: t(`giving.schedules.${value}`) }))} value={schedule} onChange={setSchedule} />
      </Group>
      {schedule === 'once' || schedule === 'monthly' ? (
        <Group>
          {schedule === 'once' ? (
            <DateField label={t('giving.date')} value={dueOn} text={formatDate(dueOn)} onChange={setDueOn} />
          ) : (
            <Field label={t('giving.dayOfMonth')} latin value={dayOfMonth} onChangeText={setDayOfMonth} placeholder="1" keyboardType="number-pad" maxLength={2} />
          )}
        </Group>
      ) : null}
      <Group>
        <Field label={t('giving.recipient')} value={recipient} onChangeText={setRecipient} maxLength={500} />
        <Row label={t('giving.reminder')} right={<Switch accessibilityLabel={t('giving.reminder')} value={reminder} onValueChange={setReminder} />} />
        <Row label={t('giving.active')} right={<Switch accessibilityLabel={t('giving.active')} value={active} onValueChange={setActive} />} />
      </Group>
      {existing ? <Button variant="destructive" title={t('giving.archive')} onPress={onArchive} /> : null}
    </Screen>
  );
}
