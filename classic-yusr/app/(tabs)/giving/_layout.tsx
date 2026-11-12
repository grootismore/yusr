import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import { headerFontOptions, largeTitleOptions } from '@/lib/headerFonts';
import { logoHeaderOptions } from '@/components/HeaderLogo';
import { HeaderIconButton } from '@/components/ui';

export default function GivingLayout() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  return (
    <Stack screenOptions={headerFontOptions(i18n.language)}>
      <Stack.Screen
        name="index"
        options={{
          title: t('giving.title'), // the tab keeps the one word; the screen says what it holds
          ...largeTitleOptions(I18nManager.isRTL),
          ...logoHeaderOptions,
          headerRight: () => <HeaderIconButton icon="add" label={t('giving.add')} onPress={() => router.push('/giving/commitment')} />,
        }}
      />
      <Stack.Screen name="commitment" options={{ title: t('giving.newTitle') }} />
    </Stack>
  );
}
