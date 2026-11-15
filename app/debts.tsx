import { useShareTag } from '@/features/household/useTag';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadError } from '@/components/LoadError';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Icon, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useDebtPayments, useDebts, usePlanSettings, useRates, useWrite } from '@/data/hooks';
import { computePlan } from '@/features/debts/compute';
import { InterestTag, DueBadge, useMonthLabel } from '@/features/debts/ui';
import { today } from '@/lib/dates';
import { formatNumber, ltr, parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

export default function Debts() {
  const colors = useColors();
  const { t } = useTranslation();
  const tag = useShareTag();
  const router = useRouter();
  const monthLabel = useMonthLabel();
  const debtsQ = useDebts();
  const paymentsQ = useDebtPayments();
  const settings = usePlanSettings().data ?? api.DEFAULT_PLAN;
  const save = useWrite(api.savePlanSettings);
  const debts = useMemo(() => debtsQ.data ?? [], [debtsQ.data]);
  const payments = useMemo(() => paymentsQ.data ?? [], [paymentsQ.data]);
  const rates = useRates().data;
  const view = useMemo(() => computePlan(debts, payments, settings, today(), rates ?? {}), [debts, payments, settings, rates]);

  // null = show the saved (or default) amount; the text only exists while the person is typing.
  const [typed, setTyped] = useState<string | null>(null);
  const budgetText = typed ?? formatNumber(settings.budgetLaari ?? view.minimums).replace(/,/g, '');

  const header = (
  <StackHeader title={t('debts.title')} />
  );

  if (debtsQ.isError && !debtsQ.data) {
    return <Screen>{header}<LoadError onRetry={() => void debtsQ.refetch()} busy={debtsQ.isFetching} /></Screen>;
  }
  if (!debtsQ.isLoading && debts.length === 0) {
    return (
      <Screen>
        {header}
        <Card tone="good"><Text>{t('debts.amanah')}</Text></Card>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <Icon name="leaf-outline" size={44} color={colors.accent} />
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
        {debts.some((d) => d.currency !== 'MVR' && d.balance_laari > 0) ? <Text variant="small" color={colors.inkMuted}>{t('debts.usdCounted', { rate: ltr(String(view.usdRate)) })}</Text> : null}
        {view.open.length === 0 ? <Text>{t('debts.settled')}</Text>
          : r.neverPaysOff ? <Row><Icon name="information-circle" color={colors.amberDeep} /><Text style={{ flex: 1 }}>{t('debts.neverPays')}</Text></Row>
          : r.debtFreeMonth ? <Row><Icon name="flag" color={colors.accent} /><Text variant="heading" style={{ flex: 1 }}>{t('debts.debtFree', { month: monthLabel(r.debtFreeMonth) })}</Text></Row> : null}
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
          <Text variant="small" color={colors.inkMuted} style={{ marginTop: -space.sm }}>{t(`debts.orderHint.${settings.strategy}`)}</Text>
          <Card>
            {view.open.map((v, i) => (
              <Pressable key={v.debt.id} accessibilityRole="button" accessibilityLabel={v.debt.lender} onPress={() => router.push({ pathname: '/debt', params: { id: v.debt.id } })} style={{ minHeight: 64, justifyContent: 'center', gap: 4 }}>
                <Row>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="label" latin color={colors.accent}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1}>{v.debt.lender}{v.debt.household_id ? <Text variant="small" color={colors.inkMuted}>{`  · ${tag(v.debt)}`}</Text> : null}</Text>
                    <Text variant="small" color={colors.inkMuted}>{t(`debts.kind.${v.debt.kind}`)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Money laari={v.debt.balance_laari} currency={v.debt.currency} />
                    {v.debt.currency !== 'MVR' ? <Msg k="debts.about" amounts={{ amount: v.balanceMvr }} variant="small" color={colors.inkMuted} /> : null}
                  </View>
                </Row>
                <View style={{ gap: 4, paddingStart: 44 }}>
                  <InterestTag interestBearing={v.debt.interest_bearing} kind={v.debt.kind} rateBps={v.debt.interest_rate_bps} />
                  <DueBadge state={v.due.state} days={v.due.days} />
                  {v.autoDeducted ? <Msg k="debts.autoLine" amounts={{ amount: v.minMvr }} variant="small" color={colors.inkMuted} /> : (
                    <>
                      {v.minMvr > 0 ? <Msg k="debts.minLine" amounts={{ amount: v.minMvr }} variant="small" color={colors.inkMuted} /> : null}
                      <Msg k={v.focus && v.suggestedMvr > v.minMvr ? 'debts.payExtra' : 'debts.payThis'} amounts={{ amount: v.suggestedMvr }} variant="small" color={v.focus && v.suggestedMvr > v.minMvr ? colors.accent : colors.ink} />
                      {v.goodwill ? <Text variant="small" color={colors.inkMuted}>{t('debts.goodwillNote')}</Text> : null}
                    </>
                  )}
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
        <Card>{view.paidOff.map((d) => (
          <Pressable key={d.id} accessibilityRole="button" accessibilityHint={t('edit.tapToEdit')} onPress={() => router.push({ pathname: '/debt', params: { id: d.id } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
            <Icon name="checkmark-circle" color={colors.accent} /><Text style={{ flex: 1 }}>{d.lender}</Text><DueBadge state="paid" days={0} />
          </Pressable>
        ))}</Card>
      ) : null}
    </Screen>
  );
}
