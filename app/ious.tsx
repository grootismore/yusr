import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, ProgressBar, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { confirmDialog } from '@/lib/dialog';
import { useIous, useIouInvites, useIouPayments, useIouPeople, useWrite } from '@/data/hooks';
import { paidOf, remaining, roleOf, statusOf, totals, type Iou, type IouPayment } from '@/features/ious/logic';
import { StatusPill } from '@/features/ious/ui';
import { useAuth } from '@/lib/auth';
import { today } from '@/lib/dates';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

export default function Ious() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const me = useAuth().userId ?? '';
  const ious = useIous().data ?? [];
  const payments = useIouPayments().data ?? [];
  const invites = useIouInvites().data ?? [];
  const accept = useWrite(api.acceptIou);
  const decline = useWrite(api.declineIou);
  const people = useIouPeople().data ?? [];
  const removePerson = useWrite(api.deleteIouPerson);
  const sum = totals(ious, payments, me);
  const open = ious.filter((i) => remaining(i, payments.filter((p) => p.iou_id === i.id)) > 0);
  const closed = ious.filter((i) => !open.includes(i));
  return (
    <Screen>
      <StackHeader title={t('ious.title')} />
      <Text color={colors.inkMuted}>{t('ious.intro')}</Text>

      {invites.map((inv) => (
        <Card key={inv.iou_id} tone="good" style={{ gap: space.sm }}>
          <Msg k={inv.direction === 'lent' ? 'ious.invite.lent' : 'ious.invite.borrowed'} values={{ name: inv.made_by_name ?? t('ious.someone') }} amounts={{ amount: inv.amount_laari }} />
          {inv.title ? <Text variant="small" color={colors.inkMuted}>{inv.title}</Text> : null}
          <Row style={{ flexWrap: 'wrap' }}>
            <Button label={t('ious.invite.accept')} onPress={async () => { await accept.mutateAsync(inv.iou_id); toast(t('ious.invite.joined')); }} loading={accept.isPending} />
            <Button kind="ghost" label={t('ious.invite.decline')} onPress={() => void decline.mutateAsync(inv.iou_id)} />
          </Row>
        </Card>
      ))}

      <Card tone="hero" style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <Text color={colors.onHero}>{t('ious.owedToYou')}</Text>
            <Money laari={sum.owedToMe} variant="title" color={colors.onHero} />
          </View>
          <View style={{ gap: 2, alignItems: 'flex-end' }}>
            <Text color={colors.onHero}>{t('ious.youOwe')}</Text>
            <Money laari={sum.iOwe} variant="title" color={colors.onHero} />
          </View>
        </Row>
      </Card>

      <Button label={t('ious.add')} icon="add" onPress={() => router.push('/iou-edit')} />

      {!ious.length ? (
        <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
          <Icon name="swap-horizontal" size={32} color={colors.accent} />
          <Text variant="title">{t('ious.emptyTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('ious.emptyBody')}</Text>
        </Card>
      ) : null}

      {open.map((i) => <IouRow key={i.id} iou={i} payments={payments} me={me} />)}
      {closed.length ? <Text variant="heading">{t('ious.settledTitle')}</Text> : null}
      {closed.map((i) => <IouRow key={i.id} iou={i} payments={payments} me={me} />)}

      {people.length ? (
        <Card style={{ gap: space.sm }}>
          <Text variant="title">{t('ious.peopleTitle')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('ious.peopleNote')}</Text>
          {people.map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text>{p.name}</Text>
                {p.email ? <Text variant="small" color={colors.inkMuted} latin>{p.email}</Text> : null}
              </View>
              <Button kind="ghost" label={t('common.remove')} onPress={async () => { if (await confirmDialog({ title: t('ious.removePersonTitle', { name: p.name }), message: t('ious.removePersonBody'), confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), destructive: true })) await removePerson.mutateAsync(p.id); }} />
            </Row>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function IouRow({ iou, payments, me }: { iou: Iou; payments: IouPayment[]; me: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const mine = payments.filter((p) => p.iou_id === iou.id);
  const left = remaining(iou, mine);
  const role = roleOf(iou, me);
  const name = iou.user_id === me || !me ? iou.person_name : t('ious.other');
  const status = statusOf(iou, mine, today());
  const percent = Math.min(100, Math.floor((paidOf(mine) * 100) / iou.amount_laari));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={() => router.push({ pathname: '/iou', params: { id: iou.id } })}>
      <Card style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title" style={{ flex: 1 }}>{name}</Text>
          <StatusPill status={status} />
        </Row>
        <Msg k={left === 0 ? 'ious.paidInFull' : role === 'lent' ? 'ious.owesYou' : 'ious.youOweThem'} values={{ name }} amounts={{ amount: left === 0 ? iou.amount_laari : left }} />
        {iou.title ? <Text variant="small" color={colors.inkMuted}>{iou.title}</Text> : null}
        <ProgressBar percent={percent} state={status === 'overdue' ? 'over' : status === 'dueSoon' ? 'near' : 'ok'} label={t('a11y.progress', { percent })} />
      </Card>
    </Pressable>
  );
}
