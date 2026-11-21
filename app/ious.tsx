import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, ProgressBar, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { removeWithUndo } from '@/lib/undo';
import { useIous, useIouInvites, useIouPayments, useIouPeople, useWrite } from '@/data/hooks';
import { groupByPerson, paidOf, totals, type IouPayment, type PersonGroup } from '@/features/ious/logic';
import { StatusPill } from '@/features/ious/ui';
import { useAuth } from '@/lib/auth';
import { formatDate, today } from '@/lib/dates';
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
  const [showPeople, setShowPeople] = useState(false);
  const removePerson = useWrite(api.deleteIouPerson);
  const restorePerson = useWrite(api.addIouPerson);
  const sum = totals(ious, payments, me);
  const groups = groupByPerson(ious, payments, me, t('ious.other'), today());
  const open = groups.filter((g) => g.openCount > 0);
  const closed = groups.filter((g) => g.openCount === 0);
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

      {open.map((g) => <PersonRow key={g.key} group={g} payments={payments} />)}
      {closed.length ? <Text variant="heading">{t('ious.settledTitle')}</Text> : null}
      {closed.map((g) => <PersonRow key={g.key} group={g} payments={payments} />)}

      {people.length ? (
        <Card style={{ gap: space.sm }}>
          {/* Folded: the saved people are only for picking a name next time, so they take one line until you open them. */}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPeople }} onPress={() => setShowPeople(!showPeople)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Row>
              <Text variant="heading" style={{ flex: 1 }}>{t('ious.peopleTitle')} ({people.length})</Text>
              <Icon name={showPeople ? 'chevron-up' : 'chevron-down'} color={colors.inkMuted} />
            </Row>
          </Pressable>
          {showPeople ? <Text variant="small" color={colors.inkMuted}>{t('ious.peopleNote')}</Text> : null}
          {showPeople ? people.map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text>{p.name}</Text>
                {p.email ? <Text variant="small" color={colors.inkMuted} latin>{p.email}</Text> : null}
              </View>
              <Button kind="ghost" label={t('common.remove')} onPress={() => void removeWithUndo({ remove: () => removePerson.mutateAsync(p.id), restore: () => restorePerson.mutateAsync({ name: p.name, email: p.email }), text: t('toast.deleted'), undo: t('toast.undo'), restored: t('toast.restored'), failed: t('common.saveFailed') })} />
            </Row>
          )) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

function PersonRow({ group, payments }: { group: PersonGroup; payments: IouPayment[] }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const open = group.ious.filter((i) => payments.filter((p) => p.iou_id === i.id).reduce((s, p) => s + p.amount_laari, 0) < i.amount_laari);
  const total = open.reduce((s, i) => s + i.amount_laari, 0);
  const paid = open.reduce((s, i) => s + paidOf(payments.filter((p) => p.iou_id === i.id)), 0);
  const percent = total > 0 ? Math.min(100, Math.floor((paid * 100) / total)) : 100;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={group.name} onPress={() => router.push({ pathname: '/iou-person', params: { key: group.key } })}>
      <Card style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title" style={{ flex: 1 }}>{group.name}</Text>
          <StatusPill status={group.status} />
        </Row>
        <Msg k={group.openCount === 0 ? 'ious.allSettled' : group.net > 0 ? 'ious.owesYou' : group.net < 0 ? 'ious.youOweThem' : 'ious.pt.even'} values={{ name: group.name }} amounts={{ amount: Math.abs(group.net) }} />
        {group.titles.length ? <Text variant="small" color={colors.inkMuted} numberOfLines={2}>{group.titles.slice(0, 2).join(' · ')}{group.titles.length > 2 ? ` ${t('ious.moreCount', { n: group.titles.length - 2 })}` : ''}</Text> : null}
        <Row style={{ justifyContent: 'space-between' }}>
          {group.openCount > 0 ? <Text variant="small" color={colors.inkMuted}>{group.nextDue ? t('ious.nextDue', { date: formatDate(group.nextDue) }) : t('ious.noDue')}</Text> : null}
        </Row>
        <ProgressBar percent={percent} state={group.status === 'overdue' ? 'over' : group.status === 'dueSoon' ? 'near' : 'ok'} label={t('a11y.progress', { percent })} />
      </Card>
    </Pressable>
  );
}
