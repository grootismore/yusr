import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Field, IconButton, ProgressBar, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useDebtPayments, useDebts, useWrite } from '@/data/hooks';
import { DueBadge, InterestTag } from '@/features/debts/ui';
import { dueStatus } from '@/features/debts/due';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { parseAmount } from '@/lib/money';
import { useColors } from '@/theme/tokens';

export default function DebtDetail() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debtsQ = useDebts();
  const paymentsQ = useDebtPayments();
  const debt = useMemo(() => debtsQ.data?.find((d) => d.id === id), [debtsQ.data, id]);
  const payments = useMemo(() => (paymentsQ.data ?? []).filter((p) => p.debt_id === id), [paymentsQ.data, id]);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatDate(today()));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  const add = useWrite(api.addDebtPayment);
  const removePayment = useWrite(api.deleteDebtPayment);
  const removeDebt = useWrite(api.deleteDebt);

  if (!debt) return <Screen><Button kind="ghost" label={t('common.back')} onPress={() => router.back()} /></Screen>;

  const month = today().slice(0, 7);
  const paidThisMonth = payments.filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + p.amount_laari, 0);
  const due = dueStatus({ dueDay: debt.due_day, today: today(), paidThisMonth, minPayment: debt.min_payment_laari, balance: debt.balance_laari });
  const percent = Math.min(100, Math.floor((debt.paid_laari * 100) / debt.opening_balance_laari));

  async function record() {
    const next: typeof errors = {};
    let laari = 0;
    try { laari = parseAmount(amount); if (laari <= 0) throw new Error('x'); } catch { next.amount = t('expense.invalidAmount'); }
    const iso = parseDate(date);
    if (!iso) next.date = t('expense.invalidDate');
    setErrors(next);
    if (Object.keys(next).length) return;
    await add.mutateAsync({ debt_id: debt!.id, amount_laari: laari, paid_on: iso!, note: note.trim() || null });
    success();
    setAmount(''); setNote('');
  }

  return (
    <Screen>
      <StackHeader title={debt.lender} numberOfLines={2} />

      <Card>
        <Text color={colors.inkMuted}>{t(`debts.kind.${debt.kind}`)}</Text>
        {debt.balance_laari > 0 ? <Msg k="debts.owedNowLabel" amounts={{ amount: debt.balance_laari }} variant="heading" /> : <Text variant="heading">{t('debts.settled')}</Text>}
        <ProgressBar percent={percent} state="ok" label={t('a11y.progress', { percent })} />
        <Msg k="debts.paidSoFar" amounts={{ amount: debt.paid_laari }} variant="small" color={colors.inkMuted} />
        <InterestTag interestBearing={debt.interest_bearing} kind={debt.kind} rateBps={debt.interest_rate_bps} />
        <DueBadge state={due.state} days={due.days} />
        <Row style={{ flexWrap: 'wrap' }}>
          <Button kind="secondary" icon="create-outline" label={t('common.edit')} onPress={() => router.push({ pathname: '/debt-edit', params: { id: debt.id } })} />
        </Row>
      </Card>

      {debt.balance_laari > 0 ? (
        <Card>
          <Text variant="heading">{t('debts.recordPayment')}</Text>
          <Field label={t('debts.paymentAmount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={debt.min_payment_laari ? undefined : '0.00'} error={errors.amount} />
          <Field label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" error={errors.date} />
          <Row>
            <Button kind="ghost" label={t('common.today')} onPress={() => setDate(formatDate(today()))} />
            <Button kind="ghost" label={t('common.yesterday')} onPress={() => setDate(formatDate(addDays(today(), -1)))} />
          </Row>
          <Field label={`${t('expense.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} />
          <Button label={t('debts.recordPayment')} onPress={record} loading={add.isPending} />
        </Card>
      ) : null}

      <Text variant="heading">{t('debts.payments')}</Text>
      <Card>
        {payments.length === 0 ? <Text color={colors.inkMuted}>{t('debts.noPayments')}</Text> : payments.map((p) => (
          <Row key={p.id} style={{ minHeight: 52 }}>
            <View style={{ flex: 1 }}>
              <Money laari={p.amount_laari} />
              <Text latin variant="small" color={colors.inkMuted}>{formatDate(p.paid_on)}{p.note ? ` · ${p.note}` : ''}</Text>
            </View>
            <IconButton icon="trash-outline" label={t('common.remove')}
              onPress={() => Alert.alert(t('debts.deletePaymentTitle'), undefined, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.remove'), style: 'destructive', onPress: () => removePayment.mutate(p.id) }])} />
          </Row>
        ))}
      </Card>

      <Button kind="ghost" label={t('debts.delete')} icon="trash-outline"
        onPress={() => Alert.alert(t('debts.deleteTitle'), t('debts.deleteBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('debts.delete'), style: 'destructive', onPress: async () => { await removeDebt.mutateAsync(debt.id); router.back(); } }])} />
    </Screen>
  );
}
