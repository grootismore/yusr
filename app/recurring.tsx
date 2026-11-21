import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { usePlan, useRates, useRecurring, useRecurringRuns, useWrite } from '@/data/hooks';
import { DEFAULT_USD_RATE } from '@/features/debts/compute';
import { recurringNeedsPlus } from '@/features/plus/limits';
import { useAuth } from '@/lib/auth';
import { useShareTag } from '@/features/household/useTag';
import { activeItems, dueRuns, nextDate, shareTarget, type RecurringItem } from '@/features/recurring/logic';
import { formatDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { useMoneyText } from '@/lib/privacy';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** Things that repeat: rent you pay or receive, bills, subscriptions. Each date is recorded for you, or waits for you to tap Record. */
export default function Recurring() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const text = useMoneyText();
  const itemsQ = useRecurring();
  const runsQ = useRecurringRuns();
  const rates = useRates().data ?? {};
  const items = useMemo(() => itemsQ.data ?? [], [itemsQ.data]);
  const runs = useMemo(() => runsQ.data ?? [], [runsQ.data]);
  const active = useMemo(() => activeItems(items), [items]);
  const due = useMemo(() => dueRuns(active.filter((i) => !i.auto_add), runs, today()), [active, runs]);
  const tag = useShareTag();
  const { userId } = useAuth();
  const plus = usePlan().data?.plus ?? false;
  const ownActive = active.filter((i) => !i.user_id || i.user_id === userId).length; // the limit counts what you made
  const record = useWrite(api.logRecurring);
  const skip = useWrite(api.skipRecurring);
  const rateFor = (c: string): string => (c === 'MVR' ? '1' : rates[c] ?? (c === 'USD' ? String(DEFAULT_USD_RATE) : '1'));
  const row = (i: RecurringItem) => (
    <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={i.name} onPress={() => router.push({ pathname: '/recurring-edit', params: { id: i.id } })} style={{ minHeight: 56, justifyContent: 'center', gap: 2 }}>
      <Row>
        <Icon name={i.kind === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} color={colors.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1}>{i.name}{i.household_id ? <Text variant="small" color={colors.inkMuted}>{`  · ${tag(i)}`}</Text> : null}</Text>
          <Text variant="small" color={colors.inkMuted}>{t(`recurring.every.${i.every}`)} · {text(i.amount_minor, i.currency)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="small" color={colors.inkMuted}>{nextDate(i, today()) ? t('recurring.next', { date: formatDate(nextDate(i, today())!) }) : ''}</Text>
          <Text variant="small" color={colors.inkMuted}>{i.auto_add ? t('recurring.auto') : t('recurring.manual')}</Text>
        </View>
      </Row>
    </Pressable>
  );

  return (
    <Screen>
      <StackHeader title={t('recurring.title')} />
      <Card tone="good"><Text>{t('recurring.intro')}</Text></Card>

      {due.length > 0 ? (
        <Card>
          <Text variant="heading">{t('recurring.dueTitle')}</Text>
          {due.map(({ item, occurrence }) => (
            <View key={`${item.id}|${occurrence}`} style={{ gap: space.sm, paddingVertical: space.xs }}>
              <Text>{item.name}</Text>
              <Text variant="small" color={colors.inkMuted}>{formatDate(occurrence)} · {text(item.amount_minor, item.currency)}</Text>
              <Row>
                <Button kind="secondary" label={item.kind === 'income' ? t('recurring.received') : t('recurring.paid')} icon="checkmark" loading={record.isPending}
                  onPress={async () => { await record.mutateAsync({ recurring_id: item.id, occurrence, kind: item.kind, name: item.name, amount_minor: item.amount_minor, currency: item.currency, fx_rate_to_mvr: rateFor(item.currency), category_id: item.category_id, household: shareTarget(item) }); success(); toast(t('toast.saved')); }} />
                <Button kind="ghost" label={t('recurring.skip')} loading={skip.isPending}
                  onPress={async () => { await skip.mutateAsync({ recurring_id: item.id, occurrence }); toast(t('recurring.skipped')); }} />
              </Row>
            </View>
          ))}
        </Card>
      ) : null}

      {active.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Icon name="repeat" size={40} color={colors.accent} />
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('recurring.emptyTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('recurring.emptyBody')}</Text>
        </Card>
      ) : (
        <>
          {(['expense', 'income'] as const).map((k) => {
            const list = active.filter((i) => i.kind === k);
            return list.length ? <View key={k} style={{ gap: space.sm }}><Text variant="heading">{t(`recurring.kind.${k}`)}</Text><Card>{list.map(row)}</Card></View> : null;
          })}
        </>
      )}

      <Button kind={active.length === 0 ? 'primary' : 'secondary'} label={t('recurring.add')} icon="add" onPress={() => (recurringNeedsPlus(ownActive, plus) ? router.push({ pathname: '/plus', params: { reason: 'recurring' } }) : router.push('/recurring-edit'))} />
    </Screen>
  );
}
