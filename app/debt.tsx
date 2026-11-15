import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, IconButton, ProgressBar, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useDebtPayments, useDebts, usePlanSettings, useRates, useWrite } from '@/data/hooks';
import { computePlan, fromMvr, minimumNow } from '@/features/debts/compute';
import { DueBadge, InterestTag } from '@/features/debts/ui';
import { dueStatus } from '@/features/debts/due';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, ltr, money, parseAmount } from '@/lib/money';
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
  const settings = usePlanSettings().data ?? api.DEFAULT_PLAN;
  const rates = useRates().data;
  const plan = useMemo(() => computePlan(debtsQ.data ?? [], paymentsQ.data ?? [], settings, today(), rates ?? {}), [debtsQ.data, paymentsQ.data, settings, rates]);
  const dv = plan.open.find((v) => v.debt.id === id);

  // null = show the suggested amount / rate; the text only exists once the person types or picks a chip.
  const [typed, setTyped] = useState<string | null>(null);
  const [rateTyped, setRateTyped] = useState<string | null>(null);
  const [date, setDate] = useState(formatDate(today()));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; date?: string; rate?: string }>({});
  const add = useWrite(api.addDebtPayment);
  const removePayment = useWrite(api.deleteDebtPayment);
  const updatePayment = useWrite((a: { id: string; amount_laari: number; paid_mvr_laari: number | null; paid_on: string; note: string | null }) => api.updateDebtPayment(a.id, { amount_laari: a.amount_laari, paid_mvr_laari: a.paid_mvr_laari, paid_on: a.paid_on, note: a.note }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const removeDebt = useWrite(api.deleteDebt);

  if (!debt) return <Screen><Button kind="ghost" label={t('common.back')} onPress={() => router.back()} /></Screen>;

  const fx = debt.currency !== 'MVR';
  const month = today().slice(0, 7);
  const paidThisMonth = payments.filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + p.amount_laari, 0);
  const minOwn = minimumNow(debt);
  const due = dueStatus({ dueDay: debt.due_day, today: today(), paidThisMonth, minPayment: minOwn, balance: debt.balance_laari });
  const percent = Math.min(100, Math.floor((debt.paid_laari * 100) / debt.opening_balance_laari));

  // What the person pays is always MVR. For a debt owed in USD it is converted at the rate typed below.
  const plain = (laari: number) => formatNumber(laari).replace(/,/g, '');
  const rateText = rateTyped ?? String(plan.usdRate);
  const suggestedMvr = dv?.suggestedMvr ?? 0;
  const amountText = typed ?? (suggestedMvr > 0 ? plain(suggestedMvr) : '');
  const rateNum = Number(rateText);
  const rateOk = Number.isFinite(rateNum) && rateNum > 0;
  let mvrLaari = 0;
  try { mvrLaari = amountText.trim() ? parseAmount(amountText) : 0; } catch { mvrLaari = 0; }
  const cents = fx && rateOk ? fromMvr(mvrLaari, rateNum) : mvrLaari;

  const reset = () => { setTyped(null); setRateTyped(null); setNote(''); setEditingId(null); setDate(formatDate(today())); setErrors({}); };

  async function record() {
    const next: typeof errors = {};
    let paidMvr = 0;
    try { paidMvr = parseAmount(amountText); if (paidMvr <= 0) throw new Error('x'); } catch { next.amount = t('expense.invalidAmount'); }
    if (fx && !rateOk) next.rate = t('expense.invalidRate');
    const iso = parseDate(date);
    if (!iso) next.date = t('expense.invalidDate');
    let reduce = fx ? fromMvr(paidMvr, rateNum) : paidMvr;
    // Paying the last cents: rounding can overshoot the balance by a hair, so settle exactly.
    const room = debt!.balance_laari + (editingId ? (payments.find((p) => p.id === editingId)?.amount_laari ?? 0) : 0);
    if (fx && reduce > room && reduce <= Math.ceil(room * 1.01) + 1) reduce = room;
    if (!next.amount && fx && reduce > room) next.amount = t('debts.tooMuchPaid');
    if (fx && !next.amount && reduce <= 0) next.amount = t('expense.invalidAmount');
    setErrors(next);
    if (Object.keys(next).length) return;
    const row = { amount_laari: reduce, paid_mvr_laari: fx ? paidMvr : null, paid_on: iso!, note: note.trim() || null };
    if (editingId) await updatePayment.mutateAsync({ id: editingId, ...row });
    else await add.mutateAsync({ debt_id: debt!.id, ...row });
    if (fx) await api.saveRate(debt!.currency, rateText);
    success();
    reset();
  }

  const quick = [
    ...(dv && dv.minMvr > 0 ? [{ key: 'min', label: t('debts.chipMin'), mvr: dv.minMvr }] : []),
    ...(dv && dv.suggestedMvr > dv.minMvr ? [{ key: 'sug', label: t('debts.chipSuggested'), mvr: dv.suggestedMvr }] : []),
    ...(dv ? [{ key: 'full', label: t('debts.chipFull'), mvr: dv.balanceMvr }] : []),
  ];

  return (
    <Screen>
      <StackHeader title={debt.lender} numberOfLines={2} />

      <Card>
        <Text color={colors.inkMuted}>{t(`debts.kind.${debt.kind}`)}{fx ? ` · ${debt.currency}` : ''}</Text>
        {debt.balance_laari > 0 ? <Msg k="debts.owedNowLabel" currency={debt.currency} amounts={{ amount: debt.balance_laari }} variant="heading" /> : <Text variant="heading">{t('debts.settled')}</Text>}
        {fx && debt.balance_laari > 0 && dv ? <Msg k="debts.about" amounts={{ amount: dv.balanceMvr }} variant="small" color={colors.inkMuted} /> : null}
        <ProgressBar percent={percent} state="ok" label={t('a11y.progress', { percent })} />
        <Msg k="debts.paidSoFar" currency={debt.currency} amounts={{ amount: debt.paid_laari }} variant="small" color={colors.inkMuted} />
        <InterestTag interestBearing={debt.interest_bearing} kind={debt.kind} rateBps={debt.interest_rate_bps} />
        <DueBadge state={due.state} days={due.days} />
        {debt.balance_laari > 0 ? (
          <View style={{ gap: 2 }}>
            <Msg k="debts.minThisMonth" currency={debt.currency} amounts={{ amount: minOwn }} />
            {debt.min_pct_bps ? <Msg k="debts.minRule" currency={debt.currency} runs={{ pct: `${debt.min_pct_bps / 100}%` }} amounts={{ floor: debt.min_payment_laari }} variant="small" color={colors.inkMuted} /> : null}
          </View>
        ) : null}
        <Row style={{ flexWrap: 'wrap' }}>
          <Button kind="secondary" icon="create-outline" label={t('common.edit')} onPress={() => router.push({ pathname: '/debt-edit', params: { id: debt.id } })} />
        </Row>
      </Card>

      {debt.balance_laari > 0 || editingId ? (
        <Card>
          <Text variant="heading">{editingId ? t('edit.paymentTitle') : t('debts.recordPayment')}</Text>
          {!editingId && dv && dv.focus && dv.suggestedMvr > dv.minMvr ? <Text variant="small" color={colors.inkMuted}>{t('debts.extraHere')}</Text> : null}
          {!editingId && quick.length > 0 ? (
            <Row style={{ flexWrap: 'wrap' }}>
              {quick.map((q) => <Chip key={q.key} label={`${q.label} · ${money(q.mvr)}`} selected={mvrLaari === q.mvr} onPress={() => setTyped(plain(q.mvr))} />)}
            </Row>
          ) : null}
          <Field label={fx ? t('debts.paidInMvr') : t('debts.paymentAmount')} hint={t('debts.amountHint')} value={amountText} onChangeText={setTyped} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
          {fx ? (
            <>
              <Field label={t('debts.fxRate', { currency: debt.currency })} value={rateText} onChangeText={setRateTyped} keyboardType="decimal-pad" error={errors.rate} />
              {cents > 0 && rateOk ? <Msg k="debts.reducesBy" currency={debt.currency} amounts={{ amount: cents }} variant="small" color={colors.inkMuted} /> : null}
              {plan.usingDefaultRate && rateTyped === null ? <Text variant="small" color={colors.inkMuted}>{t('debts.defaultRate', { rate: ltr(String(plan.usdRate)) })}</Text> : null}
            </>
          ) : null}
          <Field label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" error={errors.date} />
          <Row>
            <Button kind="ghost" label={t('common.today')} onPress={() => setDate(formatDate(today()))} />
            <Button kind="ghost" label={t('common.yesterday')} onPress={() => setDate(formatDate(addDays(today(), -1)))} />
          </Row>
          <Field label={`${t('expense.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} />
          <Button label={editingId ? t('common.save') : t('debts.recordPayment')} onPress={record} loading={add.isPending || updatePayment.isPending} />
          {editingId ? <Button kind="ghost" label={t('edit.cancelEdit')} onPress={reset} /> : null}
        </Card>
      ) : null}

      <Text variant="heading">{t('debts.payments')}</Text>
      <Card>
        {payments.length === 0 ? <Text color={colors.inkMuted}>{t('debts.noPayments')}</Text> : payments.map((p) => (
          <Row key={p.id} style={{ minHeight: 52 }}>
            <View style={{ flex: 1 }}>
              {fx && p.paid_mvr_laari ? <Money laari={p.paid_mvr_laari} /> : <Money laari={p.amount_laari} currency={debt.currency} />}
              <Text latin variant="small" color={colors.inkMuted}>
                {fx && p.paid_mvr_laari ? `${money(p.amount_laari, debt.currency)} · ` : ''}{formatDate(p.paid_on)}{p.note ? ` · ${p.note}` : ''}
              </Text>
            </View>
            <IconButton icon="create-outline" label={t('common.edit')} onPress={() => {
              setEditingId(p.id);
              const paid = p.paid_mvr_laari ?? (fx ? Math.round(p.amount_laari * plan.usdRate) : p.amount_laari);
              setTyped(plain(paid));
              setRateTyped(fx && p.paid_mvr_laari ? String(Math.round((p.paid_mvr_laari / p.amount_laari) * 10_000) / 10_000) : null);
              setDate(formatDate(p.paid_on)); setNote(p.note ?? ''); setErrors({});
            }} />
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
