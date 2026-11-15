import { useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, IconButton, ProgressBar, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useCommitments, useGiving, useWrite, useZakat } from '@/data/hooks';
import { daysBetween, nextHijriOccurrence, toHijri } from '@/features/giving/hijri';
import { activeCommitments, commitmentNote, commitmentTotal, goalPercent, isPaid, monthGiving } from '@/features/giving/logic';
import { formatDate, monthStart, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { useMoneyText } from '@/lib/privacy';
import { useColors } from '@/theme/tokens';
import { toast } from '@/lib/toast';

export default function Giving() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const month = monthStart();
  const giving = useGiving(month);
  const entries = useMemo(() => giving.data ?? [], [giving.data]);
  const zakat = useZakat().data;
  const remove = useWrite(api.deleteGiving);
  const commitments = useCommitments().data ?? [];
  const active = activeCommitments(commitments);
  const markPaid = useWrite(api.logGiving);
  const money = useMoneyText();
  const totals = useMemo(() => monthGiving(entries), [entries]);
  const months = t('hijriMonths', { returnObjects: true }) as string[];

  const goal = zakat?.sadaqah_goal_laari ?? null;
  const percent = goal ? goalPercent(totals.goalCounted, goal) : 0;
  const hasDate = zakat?.zakat_hijri_month != null && zakat?.zakat_hijri_day != null;
  const next = hasDate ? nextHijriOccurrence(zakat!.zakat_hijri_month!, zakat!.zakat_hijri_day!, today(), zakat!.hijri_adjustment) : null;
  const hijri = next ? toHijri(next, zakat!.hijri_adjustment) : null;
  const left = next ? daysBetween(today(), next) : null;

  return (
    <Screen>
      <StackHeader title={t('giving.title')} />
      <Card tone="good"><Text>{t('giving.intro')}</Text></Card>

      <Card>
        <Text color={colors.inkMuted}>{t('giving.given')}</Text>
        <Money laari={totals.goalCounted} variant="display" />
        {goal ? (
          <>
            {/* Giving more than the goal is never an error: the bar is accent at any amount. */}
            <ProgressBar percent={Math.min(100, percent)} state="ok" label={t('a11y.progress', { percent })} />
            <Msg k="giving.goalOf" amounts={{ goal }} variant="small" color={colors.inkMuted} />
            {percent >= 100 ? <Row><Icon name="heart" color={colors.accent} /><Text style={{ flex: 1 }}>{t('giving.goalReached')}</Text></Row> : null}
          </>
        ) : <Button kind="secondary" label={t('giving.goalSet')} onPress={() => router.push('/zakat')} />}
        <Text variant="small" color={colors.inkMuted}>{t('giving.countsNote')}</Text>
        {totals.obligations > 0 ? <Msg k="giving.obligations" amounts={{ amount: totals.obligations }} variant="small" color={colors.inkMuted} /> : null}
      </Card>

      <Card>
        <Row>
          <Icon name="repeat" color={colors.accent} />
          <Text variant="heading" style={{ flex: 1 }}>{t('commit.title')}</Text>
        </Row>
        {active.length === 0 ? <Text color={colors.inkMuted}>{t('commit.empty')}</Text> : (
          <>
            {active.map((c) => {
              const paid = isPaid(c, entries);
              return (
                <Row key={c.id} style={{ minHeight: 64, alignItems: 'center' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={c.recipient} onPress={() => router.push({ pathname: '/giving-commitment', params: { id: c.id } })} style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={2}>{c.recipient}</Text>
                    {c.note ? <Text variant="small" color={colors.inkMuted} numberOfLines={2}>{c.note}</Text> : null}
                    <Text variant="small" color={colors.inkMuted}>{t('commit.each', { amount: money(c.amount_laari), day: c.due_day })}</Text>
                  </Pressable>
                  {paid
                    ? <Row style={{ gap: 4 }}><Icon name="checkmark-circle" color={colors.accent} /><Text variant="small">{t('commit.paid')}</Text></Row>
                    : <Button kind="secondary" label={t('commit.markPaid')} loading={markPaid.isPending}
                        onPress={async () => { await markPaid.mutateAsync({ amount_laari: c.amount_laari, kind: c.kind, spent_at: today(), recipient_note: commitmentNote(c), commitment_id: c.id, period: month }); success(); toast(t('commit.markedPaid')); }} />}
                </Row>
              );
            })}
            <Text variant="small" color={colors.inkMuted}>{t('commit.total', { amount: money(commitmentTotal(commitments)) })}</Text>
          </>
        )}
        <Button kind="secondary" label={t('commit.add')} icon="add" onPress={() => router.push('/giving-commitment')} />
      </Card>

      <Button label={t('giving.log')} icon="add" onPress={() => router.push('/giving-add')} />

      <Card>
        <Row>
          <Icon name="moon-outline" color={colors.accent} />
          <Text variant="heading" style={{ flex: 1 }}>{t('zakat.dateTitle')}</Text>
        </Row>
        {next && hijri ? (
          <>
            <Text><Text latin>{formatDate(next)}</Text> · {hijri.day} {months[hijri.month - 1]}</Text>
            <Text color={colors.inkMuted}>{left === 0 ? t('zakat.today') : t('zakat.daysLeft', { count: left ?? 0 })}</Text>
            <Button kind="secondary" label={t('zakat.editDate')} onPress={() => router.push('/zakat')} />
          </>
        ) : <Button kind="secondary" label={t('zakat.setDate')} onPress={() => router.push('/zakat')} />}
        <Text variant="small" color={colors.inkMuted}>{t('zakat.guidance')}</Text>
      </Card>

      <Text variant="heading">{t('giving.thisMonth')}</Text>
      <Card>
        {entries.length === 0 ? <Text color={colors.inkMuted}>{t('giving.empty')}</Text> : entries.map((e) => (
          <Row key={e.id} style={{ minHeight: 56 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text>{t(`giving.kind.${e.kind}`)}{e.recipient_note ? ` · ${e.recipient_note}` : ''}</Text>
              <Text latin variant="small" color={colors.inkMuted}>{formatDate(e.spent_at)}</Text>
            </View>
            <Money laari={e.amount_laari} />
            <IconButton icon="trash-outline" label={t('common.remove')}
              onPress={() => Alert.alert(t('giving.deleteTitle'), t('giving.deleteBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.remove'), style: 'destructive', onPress: () => remove.mutate(e.expense_id, { onSuccess: () => toast(t('toast.deleted')) }) }])} />
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
