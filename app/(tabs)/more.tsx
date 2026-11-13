import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/tokens';

export default function More() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <Screen>
      <Text variant="title">{t('more.title')}</Text>
      <Card>
        <Pressable accessibilityRole="button" accessibilityLabel={t('more.giving')} onPress={() => router.push('/giving')} style={{ minHeight: 52, justifyContent: 'center' }}>
          <Row>
            <Icon name="heart-outline" color={colors.teal} />
            <Text style={{ flex: 1 }}>{t('more.giving')}</Text>
            <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} color={colors.inkMuted} />
          </Row>
        </Pressable>
      </Card>
      <Card>
        <Pressable accessibilityRole="button" accessibilityLabel={t('more.debts')} onPress={() => router.push('/debts')} style={{ minHeight: 52, justifyContent: 'center' }}>
          <Row>
            <Icon name="leaf-outline" color={colors.teal} />
            <Text style={{ flex: 1 }}>{t('more.debts')}</Text>
            <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} color={colors.inkMuted} />
          </Row>
        </Pressable>
      </Card>
      <Card>
        <Pressable accessibilityRole="button" accessibilityLabel={t('more.settings')} onPress={() => router.push('/settings')} style={{ minHeight: 52, justifyContent: 'center' }}>
          <Row>
            <Icon name="settings-outline" color={colors.teal} />
            <Text style={{ flex: 1 }}>{t('more.settings')}</Text>
            <Icon name={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} color={colors.inkMuted} />
          </Row>
        </Pressable>
      </Card>
      <Text color={colors.inkMuted}>{t('more.about')}</Text>
      <Button kind="secondary" label={t('more.signOut')} icon="log-out-outline" onPress={() => void signOut()} />
    </Screen>
  );
}
