import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Group, Row, Screen } from '@/components/ui';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen title={t('tabs.more')}>
      <Group>
        <Row label={t('more.wasiyyah')} detail={t('more.wasiyyahDetail')} chevron onPress={() => router.push('/more/wasiyyah')} />
      </Group>
      <Group>
        <Row label={t('more.accounts')} detail={t('more.accountsDetail')} chevron onPress={() => router.push('/more/accounts')} />
        <Row label={t('more.categories')} detail={t('more.categoriesDetail')} chevron onPress={() => router.push('/more/categories')} />
        <Row label={t('more.recurring')} detail={t('more.recurringDetail')} chevron onPress={() => router.push('/more/recurring')} />
      </Group>
      <Group>
        <Row label={t('more.settings')} detail={t('more.settingsDetail')} chevron onPress={() => router.push('/more/settings')} />
      </Group>
    </Screen>
  );
}
