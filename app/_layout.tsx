import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppLockGate } from '@/lib/auth/AppLock';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
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
  if (loading) return null;
  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* A resizable sheet (HIG: sheets): rests at three-quarters height, drags to full, grabber shown. */}
        <Stack.Screen
          name="transaction"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }}
        />
        <Stack.Screen name="delete-account" options={{ title: t('settings.deleteAccount'), presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/sign-in" options={{ title: t('auth.signIn'), headerLargeTitle: true }} />
      </Stack.Protected>
    </Stack>
  );
}
