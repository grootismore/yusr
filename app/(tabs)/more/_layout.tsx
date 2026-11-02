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
      <Stack.Screen
        name="recurring"
        options={{
          title: t('recurring.title'),
          headerRight: () => <HeaderIconButton icon="add" label={t('recurring.add')} onPress={() => router.push('/more/recurring-item')} />,
        }}
      />
      <Stack.Screen name="recurring-item" options={{ title: t('recurring.new') }} />
      <Stack.Screen name="wasiyyah" options={{ title: t('wasiyyah.title') }} />
      <Stack.Screen name="wasiyyah-note" options={{ title: t('wasiyyah.noteTitle') }} />
      <Stack.Screen name="wasiyyah-share" options={{ title: t('wasiyyah.shareTitle') }} />
      <Stack.Screen name="contacts" options={{ title: t('wasiyyah.contactsTitle') }} />
      <Stack.Screen name="contact-invite" options={{ title: t('wasiyyah.inviteTitle') }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      <Stack.Screen name="about" options={{ title: t('about.title') }} />
      <Stack.Screen name="audit-log" options={{ title: t('wasiyyah.activityTitle') }} />
    </Stack>
  );
}
