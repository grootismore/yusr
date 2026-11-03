import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useConsentGate } from '@/features/account/hooks';
import { useOnboarded } from '@/features/onboarding/state';
import { AppLockGate } from '@/lib/auth/AppLock';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { headerFontOptions } from '@/lib/headerFonts';
import { i18n, initI18n } from '@/lib/i18n';
import { useAppFonts } from '@/lib/useAppFonts';
import { navigationTheme } from '@/lib/navTheme';
import { QueryProvider } from '@/lib/query/Provider';
import { useColors } from '@/lib/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const fontsReady = useAppFonts();
  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);
  if (!ready || !fontsReady) return null;
  return (
    <NavigationTheme>
      <AuthProvider>
        <QueryProvider>
          <AppLockGate>
            <Layout />
          </AppLockGate>
        </QueryProvider>
      </AuthProvider>
    </NavigationTheme>
  );
}

function NavigationTheme({ children }: { children: ReactNode }) {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => navigationTheme(scheme, colors, i18n.language), [scheme, colors]);
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}

function Layout() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const consent = useConsentGate();
  const onboarded = useOnboarded();
  if (loading || (session && consent.checking)) return null;
  const mustAccept = !!session && consent.needed.length > 0;
  return (
    <Stack screenOptions={headerFontOptions(i18n.language)}>
      {/* The updated Terms or Privacy Policy come first: nothing else opens until they are accepted. */}
      <Stack.Protected guard={mustAccept}>
        <Stack.Screen name="accept-terms" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !mustAccept}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* A resizable sheet (HIG: sheets): rests at three-quarters height, drags to full, grabber shown. */}
        <Stack.Screen
          name="transaction"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="delete-account" options={{ title: t('settings.deleteAccount'), presentation: 'modal' }} />
      </Stack.Protected>
      {/* First launch on this device, before sign-in: a short, skippable intro. */}
      <Stack.Protected guard={!session && !onboarded}>
        <Stack.Screen name="(auth)/welcome" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/sign-in" options={{ title: t('auth.signIn'), headerLargeTitle: true }} />
      </Stack.Protected>
    </Stack>
  );
}
