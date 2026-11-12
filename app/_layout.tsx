import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RestartGate } from '@/components/RestartGate';
import { AuthProvider, useAuth } from '@/lib/auth';
import { i18n, initI18n } from '@/lib/i18n';
import { LockGate } from '@/lib/lock';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function Routes() {
  const { signedIn, loading } = useAuth();
  if (loading) return null;
  return (
    <LockGate active={signedIn}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="confirm" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </LockGate>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  // Thaana Noor for Dhivehi, Nunito Sans for English and numbers. If a font fails to load the app carries on in the system font.
  const [fontsLoaded, fontError] = useFonts({
    ThaanaNoor_Regular: require('../assets/fonts/ThaanaNoor-Regular.ttf'),
    ThaanaNoor_Bold: require('../assets/fonts/ThaanaNoor-Bold.ttf'),
    NunitoSans_400Regular: require('../assets/fonts/NunitoSans_400Regular.ttf'),
    NunitoSans_700Bold: require('../assets/fonts/NunitoSans_700Bold.ttf'),
  });
  useEffect(() => { void initI18n().finally(() => setReady(true)); }, []);
  if (!ready || !(fontsLoaded || fontError)) return null;
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Routes />
            <RestartGate />
          </AuthProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
