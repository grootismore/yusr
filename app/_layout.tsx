import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { i18n, initI18n } from '@/lib/i18n';
import { applyAppearance, loadAppearance } from '@/lib/appearance';
import { LockGate } from '@/lib/lock';
import { useZakatReminderSync } from '@/features/giving/useReminderSync';
import { useActivity } from '@/features/register/useActivity';
import { missingConsents } from '@/features/legal/consent';
import { WEB_LIMITED } from '@/lib/platform';
import { loadFlags, useFlag } from '@/lib/flags';
import { useConsents } from '@/data/hooks';
import { PREVIEW } from '@/lib/supabase';

// Where a signed-in visitor lands when the page they asked for is not available to them (for example /debts on the website).
export const unstable_settings = { anchor: WEB_LIMITED ? 'web-home' : '(tabs)' };

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function Routes() {
  const { signedIn, loading } = useAuth();
  useZakatReminderSync(signedIn && !WEB_LIMITED);
  useActivity(signedIn && !WEB_LIMITED);
  const consents = useConsents(signedIn && !PREVIEW);
  const setupDone = useFlag('setupDone');
  if (loading || (signedIn && !PREVIEW && consents.isLoading)) return null;
  // Everyone must have agreed to the current Terms, Privacy Policy and 18+ before using the app. If the check
  // itself fails (for example offline) we do not lock out someone who already agreed.
  const needsConsent = signedIn && !PREVIEW && consents.isSuccess && missingConsents(consents.data).length > 0;
  // First run on a phone, after agreeing to the terms: one optional setup question before the app.
  const needsSetup = signedIn && !needsConsent && !WEB_LIMITED && (!PREVIEW || process.env.EXPO_PUBLIC_PREVIEW_SETUP === '1') && setupDone === false;
  return (
    <LockGate active={signedIn}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The website: only the trusted person's pages and account deletion. */}
        <Stack.Protected guard={signedIn && !needsConsent && WEB_LIMITED}>
          <Stack.Screen name="web-home" />
        </Stack.Protected>
        {/* Shared by the website and the app: the trusted person's pages and account deletion. */}
        <Stack.Protected guard={signedIn && !needsConsent}>
          <Stack.Screen name="contact" />
          <Stack.Screen name="contact-register" />
          <Stack.Screen name="delete-account" />
        </Stack.Protected>
        {/* The app (phones). */}
        <Stack.Protected guard={needsSetup}>
          <Stack.Screen name="setup" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !needsConsent && !WEB_LIMITED && !needsSetup}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="confirm" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="register" />
          <Stack.Screen name="register-item" options={{ presentation: 'modal' }} />
          <Stack.Screen name="contacts" />
          <Stack.Screen name="contact-invite" options={{ presentation: 'modal' }} />
          <Stack.Screen name="release" />
          <Stack.Screen name="giving" />
          <Stack.Screen name="giving-add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="zakat" options={{ presentation: 'modal' }} />
          <Stack.Screen name="debts" />
          <Stack.Screen name="debt" />
          <Stack.Screen name="debt-edit" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={needsConsent}>
          <Stack.Screen name="consent" />
        </Stack.Protected>
        {/* Public: the invited person says yes or no with the link alone, no account needed. */}
        <Stack.Screen name="welcome" />
        <Stack.Screen name="check-email" />
        {/* Public: the password-reset email opens this page on the website. */}
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="accept" />
        {/* Public: how to delete an account (a web address the stores ask for). */}
        <Stack.Screen name="delete-info" />
        <Stack.Protected guard={!signedIn && !WEB_LIMITED}>
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
      </Stack>
    </LockGate>
  );
}

/** Mirrors the whole app for Dhivehi at runtime, so changing language never needs a restart. */
function Direction({ children }: { children: ReactNode }) {
  const { i18n: instance } = useTranslation();
  return <View style={{ flex: 1, direction: instance.language === 'dv' ? 'rtl' : 'ltr' }}>{children}</View>;
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
  useEffect(() => { void loadAppearance().then(applyAppearance); void Promise.all([loadFlags(), initI18n()]).finally(() => setReady(true)); }, []);
  if (!ready || !(fontsLoaded || fontError)) return null;
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="auto" />
            <Direction><Routes /></Direction>
          </AuthProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
