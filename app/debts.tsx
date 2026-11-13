import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Icon, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useDebtPayments, useDebts, usePlanSettings, useWrite } from '@/data/hooks';
import { computePlan } from '@/features/debts/compute';
import { InterestTag, DueBadge, useMonthLabel } from '@/features/debts/ui';
import { today } from '@/lib/dates';
import { formatNumber, parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

export default function Debts() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const monthLabel = useMonthLabel();
  const debtsQ = useDebts();
  const paymentsQ = useDebtPayments();
  const settings = usePlanSettings().data ?? api.DEFAULT_PLAN;
  const save = useWrite(api.savePlanSettings);
  const debts = useMemo(() => debtsQ.data ?? [], [debtsQ.data]);
  const payments = useMemo(() => paymentsQ.data ?? [], [paymentsQ.data]);
  const view = useMemo(() => computePlan(debts, payments, settings, today()), [debts, payments, settings]);

  // null = show the saved (or default) amount; the text only exists while the person is typing.
  const [typed, setTyped] = useState<string | null>(null);
  const budgetText = typed ?? formatNumber(settings.budgetLaari ?? view.minimums).replace(/,/g, '');

  const rtlBack = <Button kind="ghost" label={t('common.back')} onPress={() => router.back()} />;
  const header = (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="title" style={{ flex: 1 }}>{t('debts.title')}</Text>
      {rtlBack}
    </Row>
  );

  if (!debtsQ.isLoading && debts.length === 0) {
    return (
      <Screen>
        {header}
        <Card tone="good"><Text>{t('debts.amanah')}</Text></Card>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <Icon name="leaf-outline" size={44} color={colors.teal} />
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('debts.noDebtsTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('debts.noDebtsBody')}</Text>
          <Button label={t('debts.add')} icon="add" onPress={() => router.push('/debt-edit')} />
        </Card>
      </Screen>
    );
  }

  const r = view.result;
  return (
    <Screen>
      {header}
      <Card tone="good"><Text>{t('debts.amanah')}</Text></Card>

      <Card>
        <Text color={colors.inkMuted}>{t('debts.owed')}</Text>
        <Money laari={view.total} variant="display" />
        {view.open.length === 0 ? <Text>{t('debts.settled')}</Text>
          : r.neverPaysOff ? <Row><Icon name="information-circle" color={colors.amberDeep} /><Text style={{ flex: 1 }}>{t('debts.neverPays')}</Text></Row>
          : r.debtFreeMonth ? <Row><Icon name="flag" color={colors.teal} /><Text variant="heading" style={{ flex: 1 }}>{t('debts.debtFree', { month: monthLabel(r.debtFreeMonth) })}</Text></Row> : null}
      </Card>

      {view.open.length > 0 ? (
        <>
          <Card>
            <Text variant="heading">{t('debts.strategy')}</Text>
            <Row style={{ flexWrap: 'wrap' }}>
              {(['snowball', 'avalanche'] as const).map((s) => (
                <Chip key={s} label={t(`debts.${s}`)} selected={settings.strategy === s} onPress={() => save.mutate({ ...settings, strategy: s })} />
              ))}
            </Row>
            <Text variant="small" color={colors.inkMuted}>{t(`debts.${settings.strategy}Hint`)}</Text>
            <Field
              label={t('debts.monthly')} hint={t('debts.monthlyHint')} value={budgetText} onChangeText={setTyped} keyboardType="decimal-pad"
              onEndEditing={() => { try { const l = parseAmount(budgetText); if (l > 0) save.mutate({ ...settings, budgetLaari: l }); } catch { /* keep the last good value */ } setTyped(null); }}
            />
            {r.raisedToMinimums ? <Msg k="debts.raised" amounts={{ amount: view.minimums }} variant="small" color={colors.inkMuted} /> : null}
          </Card>

          <Text variant="heading">{t('debts.order')}</Text>
          <Card>
            {view.open.map((v, i) => (
              <Pressable key={v.debt.id} accessibilityRole="button" accessibilityLabel={v.debt.lender} onPress={() => router.push({ pathname: '/debt', params: { id: v.debt.id } })} style={{ minHeight: 64, justifyContent: 'center', gap: 4 }}>
                <Row>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="label" latin color={colors.teal}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1}>{v.debt.lender}</Text>
                    <Text variant="small" color={colors.inkMuted}>{t(`debts.kind.${v.debt.kind}`)}</Text>
                  </View>
                  <Money laari={v.debt.balance_laari} />
                </Row>
                <View style={{ gap: 4, paddingStart: 44 }}>
                  <InterestTag interestBearing={v.debt.interest_bearing} kind={v.debt.kind} rateBps={v.debt.interest_rate_bps} />
                  <DueBadge state={v.due.state} days={v.due.days} />
                  {v.clearedMonth ? <Text variant="small" color={colors.inkMuted}>{t('debts.clearedBy', { month: monthLabel(v.clearedMonth) })}</Text> : null}
                </View>
              </Pressable>
            ))}
          </Card>
          <Text variant="small" color={colors.inkMuted}>{t('debts.interestNote')}</Text>
        </>
      ) : null}

      <Button label={t('debts.add')} icon="add" kind="secondary" onPress={() => router.push('/debt-edit')} />
      {view.paidOff.length > 0 ? (
        <Card>{view.paidOff.map((d) => <Row key={d.id}><Icon name="checkmark-circle" color={colors.teal} /><Text style={{ flex: 1 }}>{d.lender}</Text><DueBadge state="paid" days={0} /></Row>)}</Card>
      ) : null}
    </Screen>
  );
}
