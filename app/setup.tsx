import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Icon, Row, Screen } from '@/components/ui';
import { useHousehold } from '@/data/hooks';
import { useFeature } from '@/features/features/hooks';
import { FeatureSwitches } from '@/features/features/ui';
import { setFlag } from '@/lib/flags';
import { space, useColors } from '@/theme/tokens';

/**
 * First run after signing in: one optional screen, "what else do you want to use?", then the app. Nothing is asked before the
 * first entry (not who it is for, not a budget): the app is useful at once, and a budget is offered after the first entry.
 * Choosing Household here takes you straight to starting or joining one.
 */
export default function Setup() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const household = useHousehold().data;
  const wantsHousehold = useFeature('household');

  async function start() {
    await setFlag('setupDone', true);
    // The household is made on its own screen; open it once the app has taken over from this one.
    if (wantsHousehold && !household) setTimeout(() => router.push('/household'), 400);
  }

  return (
    <Screen>
      <View style={{ gap: space.xs, paddingTop: space.md }}>
        <Text variant="heading" color={colors.accent}>{t('app.name')}</Text>
        <Text variant="title" accessibilityRole="header">{t('setup.featuresTitle')}</Text>
        <Text color={colors.inkMuted}>{t('setup.featuresBody')}</Text>
      </View>
      <FeatureSwitches />
      <Button label={t('setup.start')} onPress={() => void start()} />
      <Row style={{ justifyContent: 'center' }}>
        <Icon name="scan" size={18} color={colors.accent} />
        <Text variant="small" color={colors.inkMuted} style={{ flex: 1 }}>{t('setup.tip')}</Text>
      </Row>
    </Screen>
  );
}
