import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { headerFontOptions } from '@/lib/headerFonts';
import { HeaderLogo } from '@/components/HeaderLogo';
import { HeaderIconButton } from '@/components/ui';

export default function DebtsLayout() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  return (
    <Stack screenOptions={headerFontOptions(i18n.language)}>
      <Stack.Screen
        name="index"
        options={{
          title: t('tabs.debts'),
          headerLargeTitle: true,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => <HeaderIconButton icon="add" label={t('debts.add')} onPress={() => router.push('/debts/debt')} />,
        }}
      />
      <Stack.Screen name="debt" options={{ title: t('debts.newTitle') }} />
      <Stack.Screen name="detail" options={{ title: t('debts.detailTitle') }} />
      <Stack.Screen name="receivable" options={{ title: t('debts.receivableTitle') }} />
    </Stack>
  );
}
