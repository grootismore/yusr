import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Row, Screen } from '@/components/ui';
import { DeleteAccountCard } from '@/features/account/DeleteAccountCard';

export default function DeleteAccount() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t('deleteAccount.title')}</Text>
        <Button kind="ghost" label={t('common.back')} onPress={() => router.back()} />
      </Row>
      <DeleteAccountCard />
    </Screen>
  );
}
