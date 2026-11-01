import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HeaderIconButton } from '@/components/ui';

export default function MoreLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('tabs.more'), headerLargeTitle: true }} />
      <Stack.Screen
        name="accounts"
        options={{
          title: t('accounts.title'),
          headerRight: () => <HeaderIconButton icon="add" label={t('accounts.new')} onPress={() => router.push('/more/account')} />,
        }}
      />
      <Stack.Screen name="account" options={{ title: t('accounts.new') }} />
      <Stack.Screen
        name="categories"
        options={{
          title: t('categories.title'),
          headerRight: () => <HeaderIconButton icon="add" label={t('categories.new')} onPress={() => router.push('/more/category')} />,
        }}
      />
      <Stack.Screen name="category" options={{ title: t('categories.new') }} />
    </Stack>
  );
}
