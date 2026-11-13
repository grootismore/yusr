import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Screen } from '@/components/ui';
import { useColors } from '@/theme/tokens';

/** Public page (no sign-in) explaining how to delete an account. Google Play asks for a web address like this. */
export default function DeleteInfo() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
  return (
    <Screen>
      <Text variant="title">{t('deleteInfo.title')}</Text>
      <Text color={colors.inkMuted}>{t('deleteInfo.intro')}</Text>
      <Card>
        {(['step1', 'step2', 'step3'] as const).map((k, i) => <Text key={k}><Text latin>{i + 1}. </Text>{t(`deleteInfo.${k}`)}</Text>)}
      </Card>
      <Button label={t('deleteInfo.signIn')} onPress={() => router.push('/delete-account')} />
      <Text>{t('deleteInfo.what')}</Text>
      <Text color={colors.inkMuted}>{t('deleteInfo.help')}</Text>
      {email ? <Button kind="secondary" label={t('deleteInfo.email', { email })} onPress={() => void Linking.openURL(`mailto:${email}`)} /> : <Text color={colors.inkMuted}>{t('deleteInfo.emailMissing')}</Text>}
    </Screen>
  );
}
