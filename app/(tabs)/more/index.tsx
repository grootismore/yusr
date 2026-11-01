import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Group, Row, Screen } from '@/components/ui';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen>
      <Group>
        <Row label={t('more.wasiyyah')} chevron onPress={() => router.push('/more/wasiyyah')} />
      </Group>
      <Group>
        <Row label={t('more.accounts')} chevron onPress={() => router.push('/more/accounts')} />
        <Row label={t('more.categories')} chevron onPress={() => router.push('/more/categories')} />
        <Row label={t('more.recurring')} chevron onPress={() => router.push('/more/recurring')} />
      </Group>
      <Group>
        <Row label={t('more.settings')} chevron onPress={() => router.push('/settings')} />
      </Group>
    </Screen>
  );
}
