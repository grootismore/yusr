import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { logoHeaderOptions } from '@/components/HeaderLogo';
import { HeaderIconButton } from '@/components/ui';

export default function DebtsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('tabs.debts'),
          headerLargeTitle: true,
          ...logoHeaderOptions,
          headerRight: () => <HeaderIconButton icon="add" label={t('debts.add')} onPress={() => router.push('/debts/debt')} />,
        }}
      />
      <Stack.Screen name="debt" options={{ title: t('debts.newTitle') }} />
      <Stack.Screen name="detail" options={{ title: t('debts.detailTitle') }} />
      <Stack.Screen name="receivable" options={{ title: t('debts.receivableTitle') }} />
    </Stack>
  );
}
