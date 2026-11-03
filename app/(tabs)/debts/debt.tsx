import { useState } from 'react';
import { Switch } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Button, Chips, ErrorText, Field, Group, HeaderTextButton, Row, Screen } from '@/components/ui';
import { bpsToPercentText, parseNonNegativeAmount, parsePercentToBps, toInputText, useFormatDate } from '@/features/transactions/format';
import { toISODate } from '@/features/transactions/logic';
import {
  useDebts,
  useDebtSecrets,
  useSaveDebt,
  useSaveDebtSecrets,
  useSoftDelete,
  useTransactions,
} from '@/features/transactions/hooks';
import { currentBalance, startingBalanceFor } from '@/features/debts/logic';
import { DEBT_KINDS, type DebtKind } from '@/features/debts/types';
import { confirmAction } from '@/lib/confirm';
import { useDiscardGuard } from '@/lib/useDiscardGuard';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

export default function DebtFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const formatDate = useFormatDate();
  const { all } = useDebts();
  const transactions = useTransactions();
  const existing = id ? all.find((d) => d.id === id) : undefined;
  const secrets = useDebtSecrets(existing?.id);
  const save = useSaveDebt();
  const saveSecrets = useSaveDebtSecrets();
  const archive = useSoftDelete('debts');

  const [lender, setLender] = useState(existing?.lender ?? '');
  const [kind, setKind] = useState<DebtKind>(existing?.kind ?? 'bank');
  const [original, setOriginal] = useState(existing ? toInputText(existing.original_laari) : '');
  const [current, setCurrent] = useState(existing ? toInputText(currentBalance(existing, transactions)) : '');
  const [minimum, setMinimum] = useState(existing && existing.min_payment_laari > 0 ? toInputText(existing.min_payment_laari) : '');
  const [hasStart, setHasStart] = useState(!!existing?.started_on);
  const [startedOn, setStartedOn] = useState(existing?.started_on ?? toISODate(new Date()));
  const [dueDay, setDueDay] = useState(existing?.due_day ? String(existing.due_day) : '');
  const [interest, setInterest] = useState(existing?.is_interest_bearing ?? false);
  const [rate, setRate] = useState(existing?.interest_rate_bps != null ? bpsToPercentText(existing.interest_rate_bps) : '');
  // The encrypted fields are only written if the user edits them, so a failed or offline
  // load can never overwrite stored values with blanks.
  const [reference, setReference] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Asks before a changed form is closed without saving.
  const leave = useDiscardGuard([lender, kind, original, current, minimum, hasStart, startedOn, dueDay, interest, rate, reference, notes]);

  if (id && !existing) return null;

  const currentLaari = parseNonNegativeAmount(current);
  const originalLaari = original.trim() === '' ? currentLaari : parseNonNegativeAmount(original);
  const minimumLaari = parseNonNegativeAmount(minimum);
  const day = dueDay.trim() === '' ? null : Number(dueDay);
  const dayOk = day === null || (Number.isInteger(day) && day >= 1 && day <= 31);
  const rateBps = interest && rate.trim() !== '' ? parsePercentToBps(rate) : null;
  const rateOk = !interest || rate.trim() === '' || rateBps !== null;

  const error = !lender.trim()
    ? t('debts.lenderRequired')
    : currentLaari === null || originalLaari === null || minimumLaari === null || current.trim() === ''
      ? t('debts.amountInvalid')
      : !dayOk
        ? t('debts.dayInvalid')
        : !rateOk
          ? t('debts.rateInvalid')
          : null;

  function onSave() {
    setSubmitted(true);
    if (error || currentLaari === null || originalLaari === null || minimumLaari === null) return;
    if (!claim()) return;
    const debtId = save(
      {
        lender: lender.trim(),
        kind,
        original_laari: originalLaari,
        balance_laari: existing ? startingBalanceFor(currentLaari, existing.id, transactions) : currentLaari,
        min_payment_laari: minimumLaari,
        due_day: day,
        is_interest_bearing: interest,
        interest_rate_bps: interest ? rateBps : null,
        // Sent only when there is a date to set or clear, so a debt without one saves exactly as before.
        ...(hasStart || existing?.started_on ? { started_on: hasStart ? startedOn : null } : {}),
      },
      existing,
    );
    if (reference !== null || notes !== null) {
      saveSecrets(debtId, {
        reference_no: reference ?? secrets.data?.reference_no ?? '',
        notes: notes ?? secrets.data?.notes ?? '',
      });
    }
    leave(); router.back();
  }

  function onArchive() {
    if (!existing) return;
    confirmAction({
      title: t('debts.archiveTitle'),
      message: t('debts.archiveBody'),
      confirmLabel: t('debts.archive'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
          archive(existing.id);
          router.dismissAll();
        },
    });
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: existing ? t('debts.editTitle') : t('debts.newTitle'),
          headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
        }}
      />
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      <Group>
        <Field label={t('debts.lender')} value={lender} onChangeText={setLender} maxLength={100} returnKeyType="next" />
      </Group>
      <Group title={t('debts.kind')}>
        <Chips options={DEBT_KINDS.map((value) => ({ value, label: t(`debts.kinds.${value}`) }))} value={kind} onChange={setKind} />
      </Group>
      <Group>
        <Field label={t('debts.current')} latin value={current} onChangeText={setCurrent} placeholder="0.00" keyboardType="decimal-pad" />
        <Field label={t('debts.original')} latin value={original} onChangeText={setOriginal} placeholder="0.00" keyboardType="decimal-pad" />
        <Field label={t('debts.minimum')} latin value={minimum} onChangeText={setMinimum} placeholder="0.00" keyboardType="decimal-pad" />
        <Field label={t('debts.dueDay')} latin value={dueDay} onChangeText={setDueDay} placeholder="15" keyboardType="number-pad" maxLength={2} />
      </Group>
      <Group>
        <Row label={t('debts.startedOn')} right={<Switch accessibilityLabel={t('debts.startedOn')} value={hasStart} onValueChange={setHasStart} />} />
        {hasStart ? <DateField label={t('transactions.date')} value={startedOn} text={formatDate(startedOn)} onChange={setStartedOn} /> : null}
      </Group>
      <Group>
        <Row label={t('debts.interest')} right={<Switch accessibilityLabel={t('debts.interest')} value={interest} onValueChange={setInterest} />} />
        {interest ? (
          <Field label={t('debts.rate')} latin value={rate} onChangeText={setRate} placeholder="12.5" keyboardType="decimal-pad" />
        ) : null}
      </Group>
      <Group footer={t('debts.secretsHint')}>
        <Field
          label={t('debts.reference')}
          latin
          value={reference ?? secrets.data?.reference_no ?? ''}
          onChangeText={setReference}
          autoCapitalize="characters"
          maxLength={200}
        />
        <Field label={t('debts.notes')} value={notes ?? secrets.data?.notes ?? ''} onChangeText={setNotes} multiline maxLength={2000} />
      </Group>
      {existing ? <Button variant="destructive" title={t('debts.archive')} onPress={onArchive} /> : null}
    </Screen>
  );
}
