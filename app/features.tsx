import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Screen, StackHeader } from '@/components/ui';
import { FeatureSwitches } from '@/features/features/ui';
import { useColors } from '@/theme/tokens';

/** Switch the optional parts of the app on or off. Switching one off only hides it; nothing is deleted. */
export default function Features() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Screen>
      <StackHeader title={t('features.title')} />
      <Text color={colors.inkMuted}>{t('features.intro')}</Text>
      <FeatureSwitches />
    </Screen>
  );
}
