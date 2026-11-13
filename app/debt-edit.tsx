import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useDebts, useWrite } from '@/data/hooks';
import { DEBT_KINDS, type DebtInput, type DebtKind } from '@/features/debts/types';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { colors, space } from '@/theme/tokens';

const plain = (laari: number | null | undefined) => (laari ? formatNumber(laari).replace(/,/g, '') : '');
// An annual rate such as "12.5" (%) is stored in basis points (1250). parseAmount turns "12.5" into 1250 hundredths, which is exactly that.
const rateToBps = (text: string): number => parseAmount(text);

export default function DebtEdit() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const debt = useDebts().data?.find((d) => d.id === id);
  const editing = !!id && !!debt;
  const save = useWrite((a: { input: DebtInput; id?: string }) => api.saveDebt(a.input, a.id));

  const [lender, setLender] = useState(debt?.lender ?? '');
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? 'bank');
  const [amount, setAmount] = useState(plain(editing ? debt?.balance_laari : null));
  const [minPayment, setMin] = useState(plain(debt?.min_payment_laari));
  const [dueDay, setDueDay] = useState(debt?.due_day ? String(debt.due_day) : '');
  const [hasInterest, setHasInterest] = useState(debt?.interest_bearing ?? false);
  const [rate, setRate] = useState(debt?.interest_rate_bps ? String(debt.interest_rate_bps / 100) : '');
  const [inRegister, setInRegister] = useState(debt?.in_register ?? true);
  const [notes, setNotes] = useState(debt?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const interestFree = kind === 'qard_hasan';
  const interestOn = hasInterest && !interestFree;
  const paid = useMemo(() => debt?.paid_laari ?? 0, [debt]);

  async function submit() {
    const e: Record<string, string> = {};
    if (!lender.trim()) e.lender = t('debts.needLender');
    let owed = 0, min = 0, day: number | null = null, bps: number | null = null;
    try { owed = parseAmount(amount); if (owed <= 0 && !editing) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    try { min = minPayment.trim() ? parseAmount(minPayment) : 0; } catch { e.min = t('expense.invalidAmount'); }
    if (dueDay.trim()) { day = Number(dueDay); if (!Number.isInteger(day) || day < 1 || day > 31) e.day = t('debts.invalidDay'); }
    if (interestOn && rate.trim()) { try { bps = rateToBps(rate); if (bps > 20000) throw new Error('x'); } catch { e.rate = t('debts.invalidRate'); } }
    setErrors(e);
    if (Object.keys(e).length) return;
    // "Owed now" is what the person typed; the stored opening balance is that plus what they have already paid.
    const opening = editing ? owed + paid : owed;
    if (opening <= 0) { setErrors({ amount: t('expense.invalidAmount') }); return; }
    await save.mutateAsync({
      id: editing ? id : undefined,
      input: { lender: lender.trim(), kind, opening_balance_laari: opening, min_payment_laari: min, due_day: day, interest_bearing: interestOn, interest_rate_bps: interestOn ? bps : null, in_register: inRegister, notes: notes.trim() || null },
    });
    success();
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{editing ? t('debts.editTitle') : t('debts.addTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Field label={t('debts.lender')} value={lender} onChangeText={setLender} error={errors.lender} autoCapitalize="words" />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('debts.type')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {DEBT_KINDS.map((k) => <Chip key={k} label={t(`debts.kind.${k}`)} selected={kind === k} onPress={() => { setKind(k); if (k === 'qard_hasan') setHasInterest(false); }} />)}
        </Row>
      </View>
      <Field label={editing ? t('debts.owedNow') : t('debts.owedAtStart')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
      <Field label={`${t('debts.minPayment')} (${t('common.optional')})`} value={minPayment} onChangeText={setMin} keyboardType="decimal-pad" placeholder="0.00" error={errors.min} />
      <Field label={`${t('debts.dueDay')} (${t('common.optional')})`} hint={t('debts.dueDayHint')} value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" error={errors.day} />

      {!interestFree ? (
        <Card>
          <Row style={{ minHeight: 52 }}>
            <Text style={{ flex: 1 }}>{t('debts.hasInterest')}</Text>
            <Switch accessibilityLabel={t('debts.hasInterest')} value={hasInterest} onValueChange={setHasInterest} trackColor={{ true: colors.teal, false: colors.control }} />
          </Row>
          {interestOn ? <Field label={`${t('debts.rate')} (${t('common.optional')})`} value={rate} onChangeText={setRate} keyboardType="decimal-pad" error={errors.rate} /> : null}
        </Card>
      ) : null}

      <Card>
        <Row style={{ minHeight: 52 }}>
          <View style={{ flex: 1 }}>
            <Text>{t('debts.inRegister')}</Text>
            <Text variant="small" color={colors.inkMuted}>{t('debts.inRegisterNote')}</Text>
          </View>
          <Switch accessibilityLabel={t('debts.inRegister')} value={inRegister} onValueChange={setInRegister} trackColor={{ true: colors.teal, false: colors.control }} />
        </Row>
      </Card>

      <Field label={`${t('debts.notes')} (${t('common.optional')})`} hint={t('debts.notesHint')} value={notes} onChangeText={setNotes} multiline maxLength={300} />
      <Button label={t('common.save')} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
