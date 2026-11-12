import type { ReactNode } from 'react';
import { Stack, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import { headerFontOptions, largeTitleOptions } from '@/lib/headerFonts';
import { logoHeaderOptions } from './HeaderLogo';
import { HeaderIconButton } from './ui';

/** One native stack per tab: gives each tab a collapsing large title. */
export function TabStack({
  titleKey,
  addHref,
  addLabelKey,
  children,
}: {
  titleKey: string;
  addHref?: Href;
  addLabelKey?: string;
  children?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  return (
    <Stack screenOptions={headerFontOptions(i18n.language)}>
      <Stack.Screen
        name="index"
        options={{
          title: t(titleKey),
          ...largeTitleOptions(I18nManager.isRTL),
          ...logoHeaderOptions,
          headerRight:
            addHref && addLabelKey
              ? () => <HeaderIconButton icon="add" label={t(addLabelKey)} onPress={() => router.push(addHref)} />
              : undefined,
        }}
      />
      {children}
    </Stack>
  );
}
