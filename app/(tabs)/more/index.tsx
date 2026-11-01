import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Group, Row, Screen } from '@/components/ui';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen>
      <Group>
        <Row label={t('more.accounts')} chevron onPress={() => router.push('/more/accounts')} />
        <Row label={t('more.categories')} chevron onPress={() => router.push('/more/categories')} />
      </Group>
      <Group>
        <Row label={t('more.settings')} chevron onPress={() => router.push('/settings')} />
      </Group>
    </Screen>
  );
}
