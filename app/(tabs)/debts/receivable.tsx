import { useState } from 'react';
import { Alert, Switch } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Button, ErrorText, Field, Group, HeaderTextButton, Row, Screen } from '@/components/ui';
import { parsePositiveAmount, toInputText, useFormatDate } from '@/features/transactions/format';
import { useReceivables, useSaveReceivable, useSoftDelete } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';
import { confirmAction } from '@/lib/confirm';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

export default function ReceivableScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const formatDate = useFormatDate();
  const { all } = useReceivables();
  const existing = id ? all.find((r) => r.id === id) : undefined;
  const save = useSaveReceivable();
  const archive = useSoftDelete('receivables');

  const [debtor, setDebtor] = useState(existing?.debtor ?? '');
  const [amount, setAmount] = useState(existing ? toInputText(existing.amount_laari) : '');
  const [hasDate, setHasDate] = useState(!!existing?.due_on);
  const [dueOn, setDueOn] = useState(existing?.due_on ?? toISODate(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  if (id && !existing) return null;

  const amountLaari = parsePositiveAmount(amount);
  const error = !debtor.trim() ? t('debts.debtorRequired') : amountLaari === null ? t('debts.amountInvalid') : null;

  function onSave() {
    setSubmitted(true);
    if (error || amountLaari === null) return;
    if (!claim()) return;
    save(
      { debtor: debtor.trim(), amount_laari: amountLaari, due_on: hasDate ? dueOn : null, notes: notes.trim() === '' ? null : notes.trim() },
      existing,
    );
    router.back();
  }

  function onReceived() {
    if (!existing) return;
    confirmAction({
      title: t('debts.receivedTitle'),
      message: t('debts.receivedBody'),
      confirmLabel: t('debts.markReceived'),
      cancelLabel: t('common.cancel'),
      destructive: false,
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
          title: t('debts.receivableTitle'),
          headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
        }}
      />
      <Group>
        <Field label={t('debts.debtor')} value={debtor} onChangeText={setDebtor} maxLength={100} />
        <Field label={t('debts.amount')} latin value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Row label={t('debts.expectedOn')} right={<Switch accessibilityLabel={t('debts.expectedOn')} value={hasDate} onValueChange={setHasDate} />} />
        {hasDate ? <DateField label={t('transactions.date')} value={dueOn} text={formatDate(dueOn)} onChange={setDueOn} /> : null}
        <Field label={t('debts.notes')} value={notes} onChangeText={setNotes} maxLength={500} />
      </Group>
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      {existing ? <Button title={t('debts.markReceived')} onPress={onReceived} /> : null}
    </Screen>
  );
}
