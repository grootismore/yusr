import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, ListRow, Screen, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { space, useColors } from '@/theme/tokens';

export default function More() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <Screen tabbed>
      <ScreenTitle title={t('more.title')} />
      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        <ListRow icon="swap-vertical" title={t('activity.title')} onPress={() => router.push('/activity')} />
        <ListRow icon="shield-checkmark-outline" title={t('more.register')} onPress={() => router.push('/register')} />
        <ListRow icon="heart-outline" title={t('more.giving')} onPress={() => router.push('/giving')} />
        <ListRow icon="leaf-outline" title={t('more.debts')} onPress={() => router.push('/debts')} />
        <ListRow icon="people-outline" title={t('more.contactSide')} onPress={() => router.push('/contact')} />
        <ListRow icon="settings-outline" title={t('more.settings')} onPress={() => router.push('/settings')} last />
      </Card>
      <Text variant="small" color={colors.inkMuted}>{t('more.about')}</Text>
      <Button kind="secondary" label={t('more.signOut')} icon="log-out-outline" onPress={() => void signOut()} />
    </Screen>
  );
}
