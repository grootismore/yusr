import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row } from '@/components/ui';
import { useHousehold, useHouseholdEntries } from '@/data/hooks';
import { useAuth } from '@/lib/auth';
import { monthStart } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';
import { coupleBalance, summarize } from './logic';

/** The shared pot at a glance, on Home and in Reports, so the household is never a menu away. Nothing shows without a household. */
export function SharedCard({ month = monthStart(), withActions = true }: { month?: string; withActions?: boolean }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { userId } = useAuth();
  const data = useHousehold().data;
  const entries = useHouseholdEntries(month).data;
  const summary = useMemo(() => summarize(entries ?? [], data?.members ?? []), [entries, data]);
  if (!data) return null;
  const couple = data.household.mode === 'couple';
  const balance = couple && userId ? coupleBalance(summary, userId) : null;

  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityLabel={data.household.name} onPress={() => router.push('/household')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Row>
          <Icon name={couple ? 'heart-outline' : 'people-outline'} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>{data.household.name}</Text>
            <Text variant="small" color={colors.inkMuted}>{t(`household.mode.${couple ? 'couple' : 'household'}`)}</Text>
          </View>
          <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} color={colors.inkMuted} />
        </Row>
      </Pressable>
      <Row style={{ alignItems: 'flex-start', gap: space.lg }}>
        <View style={{ flex: 1, gap: 2 }}><Text variant="small" color={colors.inkMuted}>{t('household.spent')}</Text><Money laari={summary.spent} variant="heading" /></View>
        <View style={{ flex: 1, gap: 2 }}><Text variant="small" color={colors.inkMuted}>{t('household.income')}</Text><Money laari={summary.income} variant="heading" /></View>
      </Row>
      {balance ? (
        balance.owed === 0 ? <Text color={colors.inkMuted}>{t('household.square')}</Text>
          : balance.owed > 0 ? <Msg k="household.owesYou" values={{ name: balance.partner }} amounts={{ amount: balance.owed }} />
          : <Msg k="household.youOwe" values={{ name: balance.partner }} amounts={{ amount: -balance.owed }} />
      ) : !couple && summary.members.some((m) => m.paid > 0) ? (
        summary.members.filter((m) => m.paid > 0).map((m) => (
          <Row key={m.user_id}><Text variant="small" color={colors.inkMuted} style={{ flex: 1 }}>{t('household.paidShort', { name: m.name || t('household.former') })}</Text><Money laari={m.paid} variant="small" /></Row>
        ))
      ) : null}
      {withActions ? <Button kind="secondary" icon="add" label={t('household.addShared')} onPress={() => router.push({ pathname: '/add-expense', params: { shared: '1' } })} /> : null}
    </Card>
  );
}
