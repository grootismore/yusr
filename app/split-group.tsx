import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { confirmDialog } from '@/lib/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, IconButton, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useSplit, useWrite } from '@/data/hooks';
import { meOf, ofGroup, simplify } from '@/features/split/logic';
import { formatDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { useMoneyText } from '@/lib/privacy';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** One group: where everyone stands, the payments that would settle it, and every cost and payment so far. */
export default function SplitGroupScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const text = useMoneyText();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dataQ = useSplit();
  const data = useMemo(() => dataQ.data ?? { groups: [], people: [], expenses: [], shares: [], settlements: [] }, [dataQ.data]);
  const g = data.groups.find((x) => x.id === id);
  const { people, expenses, shares, settlements, net } = useMemo(() => ofGroup(data, id), [data, id]);
  const transfers = useMemo(() => simplify(net), [net]);
  const settle = useWrite(api.addSplitSettlement);
  const removeExpense = useWrite(api.deleteSplitExpense);
  const removeSettlement = useWrite(api.deleteSplitSettlement);
  const removeGroup = useWrite(api.deleteSplitGroup);
  const addPerson = useWrite(api.addSplitPerson);
  const [name, setName] = useState('');

  if (!g) return <Screen><StackHeader title={t('split.title')} /></Screen>;
  const nameOf = (pid: string) => people.find((p) => p.id === pid)?.name ?? '';
  const me = meOf(people);
  const mine = me ? net[me.id] ?? 0 : 0;
  const shareOf = (eid: string, pid?: string) => shares.find((s) => s.expense_id === eid && s.person_id === pid)?.share_minor ?? 0;

  return (
    <Screen>
      <StackHeader title={g.name} />
      <Card>
        <Text color={colors.inkMuted}>{t('split.yourBalance')}</Text>
        <Text variant="display" color={mine < 0 ? colors.coral : colors.ink}>
          {mine === 0 ? t('split.settled') : text(Math.abs(mine), g.currency)}
        </Text>
        {mine !== 0 ? <Text color={colors.inkMuted}>{mine > 0 ? t('split.youAreOwed') : t('split.youOweLabel')}</Text> : null}
      </Card>

      <Button label={t('split.addExpense')} icon="add" onPress={() => router.push({ pathname: '/split-expense', params: { group: g.id } })} />
      <Button kind="secondary" label={t('sheet.open')} icon="share-outline" onPress={() => router.push({ pathname: '/split-sheet', params: { group: g.id, date: today() } })} />

      <Card>
        <Text variant="heading">{t('split.balances')}</Text>
        {people.map((p) => {
          const n = net[p.id] ?? 0;
          return (
            <Row key={p.id}>
              <Text style={{ flex: 1 }}>{p.name}{p.is_me ? ` (${t('split.you')})` : ''}</Text>
              <Text variant="small" color={n < 0 ? colors.coral : colors.inkMuted}>{n > 0 ? t('split.isOwed', { amount: text(n, g.currency) }) : n < 0 ? t('split.owes', { amount: text(-n, g.currency) }) : t('split.square')}</Text>
            </Row>
          );
        })}
      </Card>

      {transfers.length > 0 ? (
        <Card>
          <Text variant="heading">{t('split.settleUp')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('split.settleNote')}</Text>
          {transfers.map((x) => (
            <View key={`${x.from}-${x.to}`} style={{ gap: space.sm, paddingVertical: space.xs }}>
              <Text>{t('split.pays', { from: nameOf(x.from), to: nameOf(x.to), amount: text(x.amount, g.currency) })}</Text>
              <Button kind="secondary" icon="checkmark" label={t('split.recordPayment')} loading={settle.isPending}
                onPress={async () => { await settle.mutateAsync({ group_id: g.id, from_person: x.from, to_person: x.to, amount_minor: x.amount, settled_on: today(), note: null } as Parameters<typeof api.addSplitSettlement>[0]); success(); toast(t('split.recorded')); }} />
            </View>
          ))}
        </Card>
      ) : expenses.length > 0 ? <Card tone="good"><Row><Icon name="checkmark-circle" color={colors.accent} /><Text style={{ flex: 1 }}>{t('split.allSquare')}</Text></Row></Card> : null}

      <Text variant="heading">{t('split.costs')}</Text>
      <Card>
        {expenses.length === 0 ? <Text color={colors.inkMuted}>{t('split.noCosts')}</Text> : expenses.map((e) => (
          <Row key={e.id} style={{ minHeight: 56 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1}>{e.description}</Text>
              <Text variant="small" color={colors.inkMuted} numberOfLines={1}>{t('split.paidByLine', { name: nameOf(e.paid_by) })} · <Text latin variant="small" color={colors.inkMuted}>{formatDate(e.spent_on)}</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text latin>{text(e.amount_minor, g.currency)}</Text>
              {me ? <Text variant="small" color={colors.inkMuted}>{t('split.yourShare', { amount: text(shareOf(e.id, me.id), g.currency) })}</Text> : null}
            </View>
            <IconButton icon="trash-outline" label={t('common.remove')}
              onPress={async () => { if (await confirmDialog({ title: t('split.deleteCost'), message: t('split.deleteCostBody'), confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), destructive: true })) removeExpense.mutate(e.id, { onSuccess: () => toast(t('toast.deleted')) }); }} />
          </Row>
        ))}
      </Card>

      {settlements.length > 0 ? (
        <>
          <Text variant="heading">{t('split.payments')}</Text>
          <Card>
            {settlements.map((s) => (
              <Row key={s.id} style={{ minHeight: 48 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text>{t('split.paidLine', { from: nameOf(s.from_person), to: nameOf(s.to_person) })}</Text>
                  <Text latin variant="small" color={colors.inkMuted}>{formatDate(s.settled_on)}</Text>
                </View>
                <Text latin>{text(s.amount_minor, g.currency)}</Text>
                <IconButton icon="trash-outline" label={t('common.remove')} onPress={() => removeSettlement.mutate(s.id, { onSuccess: () => toast(t('toast.deleted')) })} />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <Card>
        <Text variant="heading">{t('split.people')}</Text>
        <Text variant="small" color={colors.inkMuted}>{people.map((p) => p.name).join(', ')}</Text>
        <Field label={t('split.addPerson')} value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" />
        <Button kind="secondary" icon="person-add-outline" label={t('split.addPerson')} loading={addPerson.isPending}
          onPress={async () => { const n = name.trim(); if (!n) return; await addPerson.mutateAsync({ group_id: g.id, name: n } as Parameters<typeof api.addSplitPerson>[0]); setName(''); toast(t('toast.saved')); }} />
      </Card>

      <Button kind="ghost" icon="trash-outline" label={t('split.deleteGroup')}
        onPress={async () => { if (await confirmDialog({ title: t('split.deleteGroup'), message: t('split.deleteGroupBody'), confirmLabel: t('split.deleteGroup'), cancelLabel: t('common.cancel'), destructive: true })) { await removeGroup.mutateAsync(g.id); toast(t('toast.deleted')); router.back(); } }} />
    </Screen>
  );
}
