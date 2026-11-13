import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/theme/tokens';

/** What a signed-in person sees on the web: only the two things the website is for. */
export default function WebHome() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const chevron = i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward';
  return (
    <Screen>
      <Text variant="display" color={colors.teal} style={{ paddingTop: space.xxl }}>{t('app.name')}</Text>
      <Text color={colors.inkMuted}>{t('webHome.body')}</Text>
      <Card>
        {([['/contact', 'people-outline', t('contactSide.title')], ['/delete-account', 'trash-outline', t('deleteAccount.title')]] as const).map(([path, icon, label]) => (
          <Pressable key={path} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(path)} style={{ minHeight: 52, justifyContent: 'center' }}>
            <Row><Icon name={icon} color={colors.teal} /><Text style={{ flex: 1 }}>{label}</Text><Icon name={chevron} color={colors.inkMuted} /></Row>
          </Pressable>
        ))}
      </Card>
      <Button kind="secondary" label={t('more.signOut')} icon="log-out-outline" onPress={() => void signOut()} />
    </Screen>
  );
}
