import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen, StackHeader, type IconName } from '@/components/ui';
import { usePlan } from '@/data/hooks';
import { FREE, PLUS_SCANS, type PlusFeature } from '@/features/plus/limits';
import { formatDate } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { buyPlus, restorePurchases, type PurchaseResult } from '@/lib/purchases';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

const BENEFITS: { key: PlusFeature; icon: IconName; soon?: boolean }[] = [
  { key: 'scans', icon: 'scan' },
  { key: 'photos', icon: 'image-outline' },
  { key: 'export', icon: 'document-text-outline', soon: true },
  { key: 'household', icon: 'people-outline' },
  { key: 'history', icon: 'time-outline' },
  { key: 'split', icon: 'swap-horizontal' },
  { key: 'recurring', icon: 'repeat' },
];

/** What Kharadhu Plus adds, what stays free, and how to get it. */
export default function Plus() {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const plan = usePlan().data;
  const { reason } = useLocalSearchParams<{ reason?: PlusFeature }>();
  const nums = { free: FREE.scans, plus: PLUS_SCANS, recurring: FREE.recurring, groups: FREE.splitGroups, people: FREE.householdPeople, months: FREE.historyMonths };

  async function run(action: () => Promise<PurchaseResult>) {
    const r = await action();
    if (r === 'purchased') { await qc.invalidateQueries({ queryKey: ['plan'] }); success(); toast(t('plus.welcome')); }
    else if (r === 'unavailable') toast(t('plus.soon'));
    else if (r === 'failed') toast(t('plus.failed'), 'error');
  }

  return (
    <Screen>
      <StackHeader title={t('plus.title')} />
      <Text color={colors.inkMuted}>{t('plus.intro')}</Text>

      {reason && BENEFITS.some((b) => b.key === reason) ? <Card tone="warn"><Row><Icon name="lock-closed-outline" color={colors.amberDeep} /><Text style={{ flex: 1 }}>{t(`plus.reason.${reason}`, nums)}</Text></Row></Card> : null}

      {plan?.plus ? (
        <Card tone="good">
          <Row><Icon name="checkmark-circle" color={colors.accent} /><Text variant="heading" style={{ flex: 1 }}>{t('plus.active')}</Text></Row>
          {plan.expiresAt ? <Text color={colors.inkMuted}>{t('plus.until', { date: formatDate(plan.expiresAt.slice(0, 10)) })}</Text> : null}
        </Card>
      ) : null}

      <Card>
        {BENEFITS.map((b) => (
          <Row key={b.key} style={{ alignItems: 'flex-start', paddingVertical: space.xs }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}><Icon name={b.icon} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text>{t(`plus.benefit.${b.key}`, nums)}{b.soon ? <Text variant="small" color={colors.inkMuted}>{`  · ${t('plus.comingSoon')}`}</Text> : null}</Text>
              <Text variant="small" color={colors.inkMuted}>{t(`plus.benefitNote.${b.key}`, nums)}</Text>
            </View>
          </Row>
        ))}
      </Card>

      {plan?.plus ? null : (
        <>
          <Button label={t('plus.get')} icon="sparkles-outline" onPress={() => void run(buyPlus)} />
          <Button kind="ghost" label={t('plus.restore')} onPress={() => void run(restorePurchases)} />
          <Text variant="small" color={colors.inkMuted}>{t('plus.priceNote')}</Text>
        </>
      )}

      <Card>
        <Text variant="heading">{t('plus.freeTitle')}</Text>
        <Text color={colors.inkMuted}>{t('plus.freeBody', nums)}</Text>
      </Card>
    </Screen>
  );
}
