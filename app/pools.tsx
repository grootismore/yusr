import { shareTarget } from '@/features/recurring/logic';
import { useShareTag } from '@/features/household/useTag';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { usePoolPayments, usePools, useRates, useWrite } from '@/data/hooks';
import { DEFAULT_USD_RATE, toMvr } from '@/features/debts/compute';
import { activePools, isPoolPaid, monthlyTotal, payoutDue, payoutMinor } from '@/features/pools/logic';
import { formatMonthInput, monthStart, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { money } from '@/lib/money';
import { useMoneyText } from '@/lib/privacy';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** Money pools: a fixed amount in every month with friends or family, and the month the person takes the pot out. */
export default function Pools() {
  const colors = useColors();
  const { t } = useTranslation();
  const tag = useShareTag();
  const router = useRouter();
  const text = useMoneyText();
  const poolsQ = usePools();
  const pools = useMemo(() => poolsQ.data ?? [], [poolsQ.data]);
  const payments = usePoolPayments().data ?? [];
  const rates = useRates().data ?? {};
  const month = monthStart();
  const active = useMemo(() => activePools(pools), [pools]);
  const pay = useWrite(api.logPoolPayment);
  const addIncome = useWrite(api.addIncome);
  const update = useWrite(api.updatePool);
  const rateFor = (currency: string): string => (currency === 'MVR' ? '1' : rates[currency] ?? (currency === 'USD' ? String(DEFAULT_USD_RATE) : '1'));
  const rateNum = (c: string) => Number(rateFor(c));
  const total = monthlyTotal(pools, (minor, c) => toMvr(minor, c, { [c]: rateNum(c) }));

  return (
    <Screen>
      <StackHeader title={t('pools.title')} />
      <Card tone="good"><Text>{t('pools.intro')}</Text></Card>

      {active.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Icon name="cash-outline" size={40} color={colors.accent} />
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('pools.emptyTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('pools.emptyBody')}</Text>
        </Card>
      ) : (
        <Card>
          {active.map((p) => {
            const paid = isPoolPaid(p, payments, month);
            const pot = payoutMinor(p);
            return (
              <View key={p.id} style={{ gap: space.sm, paddingVertical: space.xs }}>
                <Row style={{ alignItems: 'center' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={p.name} onPress={() => router.push({ pathname: '/pool-edit', params: { id: p.id } })} style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={2}>{p.name}{p.household_id ? <Text variant="small" color={colors.inkMuted}>{`  · ${tag(p)}`}</Text> : null}</Text>
                    <Text variant="small" color={colors.inkMuted}>{t('pools.each', { amount: text(p.amount_minor, p.currency), day: p.due_day })}</Text>
                    {p.currency !== 'MVR' ? <Msg k="pools.about" amounts={{ amount: toMvr(p.amount_minor, p.currency, { [p.currency]: rateNum(p.currency) }) }} variant="small" color={colors.inkMuted} /> : null}
                  </Pressable>
                  {paid
                    ? <Row style={{ gap: 4 }}><Icon name="checkmark-circle" color={colors.accent} /><Text variant="small">{t('commit.paid')}</Text></Row>
                    : <Button kind="secondary" label={t('commit.markPaid')} loading={pay.isPending}
                        onPress={async () => { await pay.mutateAsync({ pool_id: p.id, name: p.name, amount_minor: p.amount_minor, currency: p.currency, fx_rate_to_mvr: rateFor(p.currency), spent_at: today(), period: month, household: shareTarget(p) }); success(); toast(t('commit.markedPaid')); }} />}
                </Row>
                {p.payout_month ? (
                  <Text variant="small" color={colors.inkMuted}>
                    {pot ? t('pools.turnAmount', { month: formatMonthInput(p.payout_month), amount: text(pot, p.currency) }) : t('pools.turn', { month: formatMonthInput(p.payout_month) })}
                  </Text>
                ) : null}
                {payoutDue(p, month) && pot ? (
                  <Button kind="secondary" icon="download-outline" label={t('pools.recordPayout', { amount: money(pot, p.currency) })} loading={addIncome.isPending}
                    onPress={async () => {
                      await addIncome.mutateAsync({ amount_laari: pot, currency: p.currency, fx_rate_to_mvr: rateFor(p.currency), category_id: null, merchant: null, spent_at: today(), note: p.name });
                      await update.mutateAsync({ id: p.id, input: { name: p.name, note: p.note, amount_minor: p.amount_minor, currency: p.currency, due_day: p.due_day, members: p.members, payout_month: p.payout_month, payout_received: true } });
                      success(); toast(t('pools.payoutRecorded'));
                    }} />
                ) : null}
              </View>
            );
          })}
          <Text variant="small" color={colors.inkMuted}>{t('pools.total', { amount: text(total) })}</Text>
        </Card>
      )}

      <Button kind={active.length === 0 ? 'primary' : 'secondary'} label={t('pools.add')} icon="add" onPress={() => router.push('/pool-edit')} />
    </Screen>
  );
}
