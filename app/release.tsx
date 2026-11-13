import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Icon, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useAudit, useCheckin, useWrite } from '@/data/hooks';
import { eventKey } from '@/features/register/readiness';
import { AWAY_CHOICES } from '@/features/register/types';
import { formatDate } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { space, useColors } from '@/theme/tokens';

export default function Release() {
  const colors = useColors();
  const { t } = useTranslation();
  const checkin = useCheckin().data;
  const audit = useAudit().data ?? [];
  const okay = useWrite(api.recordActivity);
  const away = useWrite(api.setAwayMode);
  const awayUntil = checkin?.away_until && new Date(checkin.away_until) > new Date() ? checkin.away_until.slice(0, 10) : null;
  const released = checkin?.state === 'released';

  return (
    <Screen>
      <StackHeader title={t('release.title')} />
      <Card tone="good"><Text>{t('release.intro')}</Text></Card>

      {checkin ? (
        <Card tone={checkin.state === 'active' ? 'plain' : released ? 'bad' : 'warn'}>
          <Row>
            <Icon name={checkin.state === 'active' ? 'shield-checkmark' : 'information-circle'} color={checkin.state === 'active' ? colors.accent : released ? colors.coral : colors.amberDeep} />
            <Text style={{ flex: 1 }} accessibilityLiveRegion="polite">{t(`release.state.${checkin.state}`)}</Text>
          </Row>
          {!released ? <Button label={t('release.okay')} icon="heart-outline" loading={okay.isPending} onPress={async () => { await okay.mutateAsync(undefined); success(); }} /> : null}
        </Card>
      ) : null}

      {!released ? (
        <Card>
          <Text variant="heading">{t('release.away')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('release.awayNote')}</Text>
          {awayUntil ? (
            <>
              <Text>{t('release.awayOn', { date: formatDate(awayUntil) })}</Text>
              <Button kind="secondary" label={t('release.awayEnd')} onPress={() => away.mutate(0)} />
            </>
          ) : (
            <Row style={{ flexWrap: 'wrap' }}>{AWAY_CHOICES.map((d) => <Chip key={d} label={t('release.awayDays', { count: d })} onPress={() => away.mutate(d)} />)}</Row>
          )}
        </Card>
      ) : null}

      <Text variant="heading">{t('release.log')}</Text>
      <Card>
        {audit.length === 0 ? <Text color={colors.inkMuted}>{t('release.logEmpty')}</Text> : audit.map((a) => (
          <View key={a.id} style={{ gap: 2, minHeight: 48 }}>
            <Text>{t(`release.events.${eventKey(a.event)}`)}</Text>
            <Text variant="small" color={colors.inkMuted}>{t(`release.by.${a.actor}`)} · <Text latin variant="small" color={colors.inkMuted}>{formatDate(a.created_at.slice(0, 10))}</Text></Text>
          </View>
        ))}
      </Card>
      <View style={{ height: space.md }} />
    </Screen>
  );
}
