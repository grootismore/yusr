import { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, ProgressBar, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useGiving, useWrite, useZakat } from '@/data/hooks';
import { daysBetween, nextHijriOccurrence, toHijri } from '@/features/giving/hijri';
import { goalPercent, monthGiving } from '@/features/giving/logic';
import { formatDate, monthStart, today } from '@/lib/dates';
import { useColors } from '@/theme/tokens';

export default function Giving() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const month = monthStart();
  const giving = useGiving(month);
  const entries = useMemo(() => giving.data ?? [], [giving.data]);
  const zakat = useZakat().data;
  const remove = useWrite(api.deleteGiving);
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
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t('giving.title')}</Text>
        <Button kind="ghost" label={t('common.back')} onPress={() => router.back()} />
      </Row>
      <Card tone="good"><Text>{t('giving.intro')}</Text></Card>

      <Card>
        <Text color={colors.inkMuted}>{t('giving.given')}</Text>
        <Money laari={totals.goalCounted} variant="display" />
        {goal ? (
          <>
            {/* Giving more than the goal is never an error: the bar is teal at any amount. */}
            <ProgressBar percent={Math.min(100, percent)} state="ok" label={t('a11y.progress', { percent })} />
            <Msg k="giving.goalOf" amounts={{ goal }} variant="small" color={colors.inkMuted} />
            {percent >= 100 ? <Row><Icon name="heart" color={colors.teal} /><Text style={{ flex: 1 }}>{t('giving.goalReached')}</Text></Row> : null}
          </>
        ) : <Button kind="secondary" label={t('giving.goalSet')} onPress={() => router.push('/zakat')} />}
        <Text variant="small" color={colors.inkMuted}>{t('giving.countsNote')}</Text>
        {totals.obligations > 0 ? <Msg k="giving.obligations" amounts={{ amount: totals.obligations }} variant="small" color={colors.inkMuted} /> : null}
      </Card>

      <Button label={t('giving.log')} icon="add" onPress={() => router.push('/giving-add')} />

      <Card>
        <Row>
          <Icon name="moon-outline" color={colors.teal} />
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
            <Button kind="ghost" icon="trash-outline" label={t('common.remove')}
              onPress={() => Alert.alert(t('giving.deleteTitle'), t('giving.deleteBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.remove'), style: 'destructive', onPress: () => remove.mutate(e.expense_id) }])} />
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
