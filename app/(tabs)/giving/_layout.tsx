import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HeaderLogo } from '@/components/HeaderLogo';
import { HeaderIconButton } from '@/components/ui';

export default function GivingLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('tabs.giving'),
          headerLargeTitle: true,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => <HeaderIconButton icon="add" label={t('giving.add')} onPress={() => router.push('/giving/commitment')} />,
        }}
      />
      <Stack.Screen name="commitment" options={{ title: t('giving.newTitle') }} />
    </Stack>
  );
}
