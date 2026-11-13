import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, IconButton, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useHoldings, useWrite } from '@/data/hooks';
import { checkConversion, conversionGain, paydayValue } from '@/features/foreign/logic';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, ltr, money, parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

/** Record that some of a foreign currency you were holding was exchanged to MVR. It moves holdings only: reports do not change. */
export default function Convert() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { currency: wanted } = useLocalSearchParams<{ currency?: string }>();
  const { held, conversions } = useHoldings();
  const holding = held.find((h) => h.currency === wanted) ?? held[0];
  const currency = holding?.currency ?? wanted ?? 'USD';
  const [amount, setAmount] = useState('');
  const [mvr, setMvr] = useState('');
  const [date, setDate] = useState(formatDate(today()));
  const [errors, setErrors] = useState<{ amount?: string; mvr?: string; date?: string }>({});
  const add = useWrite(api.addConversion);
  const remove = useWrite(api.deleteConversion);

  let minor = 0; let mvrLaari = 0;
  try { minor = parseAmount(amount); mvrLaari = parseAmount(mvr); } catch { /* still typing */ }
  const ready = !!holding && minor > 0 && mvrLaari > 0 && minor <= holding.minor;
  const rate = ready ? (mvrLaari / minor).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : null;
  const gain = ready && holding ? conversionGain(holding, minor, mvrLaari) : null;

  async function submit() {
    if (!holding) return;
    const iso = parseDate(date);
    const check = checkConversion(holding, amount, mvr);
    const next: typeof errors = {};
    if (!iso) next.date = t('expense.invalidDate');
    if (!check.ok) { if (check.error === 'mvr') next.mvr = t('expense.invalidAmount'); else next.amount = t(check.error === 'tooMuch' ? 'foreign.tooMuch' : 'expense.invalidAmount'); }
    setErrors(next);
    if (!check.ok || !iso) return;
    await add.mutateAsync({ currency, amount_minor: check.minor, mvr_laari: check.mvr, converted_at: iso, note: null });
    success(); router.back();
  }

  return (
    <Screen>
      <StackHeader title={t('foreign.convertTitle', { currency })} />
      {holding ? (
        <>
          <Card tone="hero" style={{ gap: space.xs }}>
            <Msg k="foreign.youHold" runs={{ amount: money(holding.minor, currency) }} color={colors.onHero} />
            <Msg k="foreign.heldMvr" amounts={{ amount: paydayValue(holding, holding.minor) }} variant="small" color={colors.onHero} />
          </Card>
          <Field label={`${t('foreign.amountToConvert')} (${currency})`} value={amount} onChangeText={(v) => { setAmount(v); setErrors({}); }} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 22 }} />
          <Row><Chip label={formatNumber(holding.minor)} onPress={() => setAmount(formatNumber(holding.minor).replace(/,/g, ''))} /></Row>
          <Field label={t('foreign.mvrReceived')} value={mvr} onChangeText={(v) => { setMvr(v); setErrors({}); }} keyboardType="decimal-pad" placeholder="0.00" error={errors.mvr} style={{ fontSize: 22 }} />
          {rate ? <Text color={colors.inkMuted}>{t('foreign.rateIs', { rate: ltr(rate) })}</Text> : null}
          {gain !== null ? (
            gain === 0 ? <Text color={colors.inkMuted}>{t('foreign.even')}</Text>
              : <Msg k={gain > 0 ? 'foreign.gain' : 'foreign.loss'} amounts={{ amount: Math.abs(gain) }} color={gain > 0 ? colors.accent : colors.coral} />
          ) : null}
          <View style={{ gap: space.sm }}>
            <Field label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={(v) => { setDate(v); setErrors({}); }} keyboardType="numbers-and-punctuation" error={errors.date} />
            <Row>
              <Chip label={t('common.today')} onPress={() => setDate(formatDate(today()))} />
              <Chip label={t('common.yesterday')} onPress={() => setDate(formatDate(addDays(today(), -1)))} />
            </Row>
          </View>
          <Button label={t('common.save')} onPress={submit} loading={add.isPending} />
          <Text variant="small" color={colors.inkMuted}>{t('foreign.explain')}</Text>
        </>
      ) : <Card><Text color={colors.inkMuted}>{t('foreign.noHistory')}</Text></Card>}

      <Text variant="heading">{t('foreign.history')}</Text>
      <Card>
        {conversions.length === 0 ? <Text color={colors.inkMuted}>{t('foreign.noHistory')}</Text> : conversions.map((c) => (
          <Row key={c.id} style={{ minHeight: 56 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Money laari={c.amount_minor} currency={c.currency} />
              <Text latin variant="small" color={colors.inkMuted}>{formatDate(c.converted_at)}</Text>
            </View>
            <Money laari={c.mvr_laari} prefix="→ " />
            <IconButton icon="trash-outline" label={t('common.remove')}
              onPress={() => Alert.alert(t('foreign.deleteTitle'), undefined, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.remove'), style: 'destructive', onPress: () => remove.mutate(c.id) }])} />
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
