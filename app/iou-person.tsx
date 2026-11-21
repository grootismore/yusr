import { Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Row, Screen, StackHeader } from '@/components/ui';
import { useIous, useIouPayments } from '@/data/hooks';
import { groupByPerson, paidOf, personTimeline, remaining, roleOf, statusOf } from '@/features/ious/logic';
import { PersonTimeline, StatusPill } from '@/features/ious/ui';
import { useAuth } from '@/lib/auth';
import { today } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';

/** Everything with one person: where you stand overall, the whole story in date order, and each IOU. */
export default function IouPerson() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const me = useAuth().userId ?? '';
  const { key } = useLocalSearchParams<{ key?: string }>();
  const ious = useIous().data ?? [];
  const payments = useIouPayments().data ?? [];
  const group = groupByPerson(ious, payments, me, t('ious.other'), today()).find((g) => g.key === key);
  if (!group) return <Screen><StackHeader title={t('ious.title')} /><Text>{t('common.loading')}</Text></Screen>;
  const events = personTimeline(group, payments, me, today());
  const mine = group.key.startsWith('n:');
  return (
    <Screen>
      <StackHeader title={group.name} />
      <Card tone="hero" style={{ gap: space.sm }}>
        <Text color={colors.onHero}>{t(group.net > 0 ? 'ious.theyOwe' : group.net < 0 ? 'ious.youOweShort' : 'ious.pt.even')}</Text>
        <Money laari={Math.abs(group.net)} variant="display" color={colors.onHero} />
        {group.owedToMe > 0 && group.iOwe > 0 ? <Msg k="ious.pt.both" values={{ name: group.name }} amounts={{ owed: group.owedToMe, owe: group.iOwe }} variant="small" color={colors.onHero} /> : null}
      </Card>

      {mine ? <Button label={t('ious.add')} icon="add" onPress={() => router.push({ pathname: '/iou-edit', params: { name: group.name, email: group.email ?? '' } })} /> : null}

      <Card style={{ gap: space.md }}>
        <Text variant="title">{t('ious.timeline')}</Text>
        <PersonTimeline events={events} name={group.name} />
      </Card>

      <Text variant="heading">{t('ious.theirIous')}</Text>
      {group.ious.map((i) => {
        const mineP = payments.filter((p) => p.iou_id === i.id);
        const left = remaining(i, mineP);
        const role = roleOf(i, me);
        return (
          <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={i.title ?? t('ious.untitled')} onPress={() => router.push({ pathname: '/iou', params: { id: i.id } })}>
            <Card style={{ gap: space.xs }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="title" style={{ flex: 1 }}>{i.title ?? t('ious.untitled')}</Text>
                <StatusPill status={statusOf(i, mineP, today())} />
              </Row>
              <Msg k={left === 0 ? 'ious.paidInFull' : role === 'lent' ? 'ious.owesYou' : 'ious.youOweThem'} values={{ name: group.name }} amounts={{ amount: left === 0 ? i.amount_laari : left }} />
              <Msg k="ious.ofTotal" amounts={{ paid: paidOf(mineP), total: i.amount_laari }} variant="small" color={colors.inkMuted} />
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
