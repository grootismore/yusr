import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppLockGate } from '@/lib/auth/AppLock';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { initI18n } from '@/lib/i18n';
import { QueryProvider } from '@/lib/query/Provider';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <AuthProvider>
      <QueryProvider>
        <AppLockGate>
          <Layout />
        </AppLockGate>
      </QueryProvider>
    </AuthProvider>
  );
}

function Layout() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title'), headerLargeTitle: true }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/sign-in" options={{ title: t('auth.signIn'), headerLargeTitle: true }} />
      </Stack.Protected>
    </Stack>
  );
}
