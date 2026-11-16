import { useShareTag } from '@/features/household/useTag';
import { useMemo, useState, type ReactNode } from 'react';
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
import { DueBadge, useMonthLabel } from '@/features/debts/ui';
import { today } from '@/lib/dates';
import { formatNumber, ltr, parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

/** One line of a debt's details: what it is on the start side, its value on the end side. Long values wrap instead of being cut. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <Row style={{ alignItems: 'flex-start', gap: space.md }}>
      <Text color={colors.inkMuted} style={{ flex: 1 }}>{label}</Text>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View>
    </Row>
  );
}

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
          {view.open.map((v, i) => {
            const d = v.debt;
            const rate = d.interest_bearing && d.interest_rate_bps ? `${(d.interest_rate_bps / 100).toFixed(2).replace(/\.?0+$/, '')}%` : null;
            const extra = v.focus && v.suggestedMvr > v.minMvr;
            return (
              <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={d.lender} onPress={() => router.push({ pathname: '/debt', params: { id: d.id } })}>
                <Card style={{ gap: space.md }}>
                  <Row style={{ alignItems: 'flex-start' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="label" latin color={colors.accent}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="heading">{d.lender}</Text>
                      <Text variant="small" color={colors.inkMuted}>{t(`debts.kind.${d.kind}`)}{d.household_id ? `  · ${tag(d)}` : ''}</Text>
                    </View>
                  </Row>
                  <View style={{ height: 1, backgroundColor: colors.line }} />
                  <Detail label={t('debts.row.owed')}>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Money laari={d.balance_laari} currency={d.currency} variant="heading" />
                      {d.currency !== 'MVR' ? <Msg k="debts.about" amounts={{ amount: v.balanceMvr }} variant="small" color={colors.inkMuted} /> : null}
                    </View>
                  </Detail>
                  <Detail label={t('debts.row.interest')}>
                    {d.interest_bearing ? <Text latin={!!rate}>{rate ?? t('debts.interest')}</Text> : <Text>{t('debts.row.noInterest')}</Text>}
                  </Detail>
                  {v.autoDeducted ? (
                    <Detail label={t('debts.row.fromSalary')}><Money laari={v.minMvr} /></Detail>
                  ) : (
                    <>
                      {v.minMvr > 0 ? <Detail label={t('debts.row.minimum')}><Money laari={v.minMvr} /></Detail> : null}
                      <Detail label={t('debts.row.payThis')}><Money laari={v.suggestedMvr} color={extra ? colors.accent : undefined} variant={extra ? 'heading' : 'body'} /></Detail>
                    </>
                  )}
                  {v.clearedMonth ? <Detail label={t('debts.row.clearedBy')}><Text>{monthLabel(v.clearedMonth)}</Text></Detail> : null}
                  {v.due.state !== 'none' && v.due.state !== 'ok' ? <Detail label={t('debts.row.due')}><DueBadge state={v.due.state} days={v.due.days} /></Detail> : null}
                  {v.goodwill ? <Text variant="small" color={colors.inkMuted}>{t('debts.goodwillNote')}</Text> : null}
                </Card>
              </Pressable>
            );
          })}
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
