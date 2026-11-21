import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useMyInvites, usePlan, useSplit, useWrite } from '@/data/hooks';
import { splitNeedsPlus } from '@/features/plus/limits';
import { meOf, ofGroup } from '@/features/split/logic';
import { useAuth } from '@/lib/auth';
import { useMoneyText } from '@/lib/privacy';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** Split: groups of friends, a trip, a flat. Who paid for what, who owes whom, settling up. */
export default function Split() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const text = useMoneyText();
  const dataQ = useSplit();
  const data = useMemo(() => dataQ.data ?? { groups: [], people: [], expenses: [], shares: [], settlements: [] }, [dataQ.data]);
  const groups = data.groups.filter((g) => !g.archived);
  const plus = usePlan().data?.plus ?? false;
  const { userId } = useAuth();
  const invites = useMyInvites().data ?? [];
  const accept = useWrite(api.acceptSplitInvite);
  const decline = useWrite(api.declineSplitInvite);
  const chevron = 'chevron-forward';

  return (
    <Screen>
      <StackHeader title={t('split.title')} />
      <Card tone="good"><Text>{t('split.intro')}</Text></Card>
      {invites.map((inv) => (
        <Card key={inv.invite_id}>
          <Text variant="heading">{t('split.invitedTo', { group: inv.group_name })}</Text>
          <Text color={colors.inkMuted}>{t('split.invitedBy', { name: inv.invited_by_name ?? '', person: inv.person_name })}</Text>
          <Button label={t('split.accept')} icon="checkmark" loading={accept.isPending} onPress={() => accept.mutate(inv.invite_id, { onSuccess: () => toast(t('split.joined')) })} />
          <Button kind="ghost" label={t('split.decline')} onPress={() => decline.mutate(inv.invite_id)} />
        </Card>
      ))}
      {groups.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Icon name="swap-horizontal" size={40} color={colors.accent} />
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('split.emptyTitle')}</Text>
          <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('split.emptyBody')}</Text>
        </Card>
      ) : (
        <Card>
          {groups.map((g) => {
            const { people, net } = ofGroup(data, g.id);
            const me = meOf(people, userId);
            const mine = me ? net[me.id] ?? 0 : 0;
            return (
              <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={g.name} onPress={() => router.push({ pathname: '/split-group', params: { id: g.id } })} style={{ minHeight: 64, justifyContent: 'center' }}>
                <Row>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1}>{g.name}</Text>
                    <Text variant="small" color={colors.inkMuted}>{people.map((p) => p.name).join(', ')}</Text>
                    <Text variant="small" color={mine < 0 ? colors.coral : colors.inkMuted}>
                      {mine > 0 ? t('split.owedToYou', { amount: text(mine, g.currency) }) : mine < 0 ? t('split.youOwe', { amount: text(-mine, g.currency) }) : t('split.settled')}
                    </Text>
                  </View>
                  <Icon name={chevron} color={colors.inkMuted} />
                </Row>
              </Pressable>
            );
          })}
        </Card>
      )}
      <Button kind={groups.length === 0 ? 'primary' : 'secondary'} label={t('split.newGroup')} icon="add" onPress={() => (splitNeedsPlus(groups.filter((g) => !g.user_id || g.user_id === userId).length, plus) ? router.push({ pathname: '/plus', params: { reason: 'split' } }) : router.push('/split-new-group'))} />
    </Screen>
  );
}
