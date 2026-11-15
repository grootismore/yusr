import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { Button, Icon, Logo, Screen } from '@/components/ui';
import { space, useColors } from '@/theme/tokens';

/** A link or address that goes nowhere. Calm words and one way back; it never redirects by itself. */
export default function NotFound() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen grow>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl }}>
        <Logo size={72} />
        <Icon name="compass-outline" size={28} color={colors.inkMuted} />
        <Text variant="title" style={{ textAlign: 'center' }}>{t('notFound.title')}</Text>
        <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('notFound.body')}</Text>
        <Button label={t('notFound.home')} icon="home-outline" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
