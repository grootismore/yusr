import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { i18n, initI18n } from '@/lib/i18n';
import { VARIANTS, lastGoodVariant, markBoot, previousAlive, previousBoot, previousVariant, variant } from '@/lib/boot';
import { reportError, wrapRoot } from '@/lib/monitoring';
import { clearCrashNote, describeError, readCrashNote, showErrorsHere } from '@/lib/crashNote';
import { applyStoredAppearance, loadAppearance } from '@/lib/appearance';
import { LockGate } from '@/lib/lock';
import { useZakatReminderSync } from '@/features/giving/useReminderSync';
import { useActivity } from '@/features/register/useActivity';
import { WEB_LIMITED } from '@/lib/platform';
import { loadFlags } from '@/lib/flags';
import { useGate } from '@/lib/gate';

// No `unstable_settings.anchor` here on purpose. An anchor on a guarded screen (the tabs, for a signed-out person) made the
// router bounce between the anchor and the public fallback forever on phones: a blank screen at launch. The `accept`
// screen sends anyone without an invite token to the right place instead. Covered by src/__tests__/launchReal.test.tsx.

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function Routes() {
  markBoot('routes');
  const pathname = usePathname();
  markBoot(`path:${pathname}`);
  const { signedIn, waiting, needsConsent, needsSetup } = useGate();
  useZakatReminderSync(signedIn && !WEB_LIMITED);
  useActivity(signedIn && !WEB_LIMITED);
  if (waiting) { markBoot('routes-waiting'); return null; }
  markBoot('routes-stack');
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
          <Stack.Screen name="set-pin" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="convert" options={{ presentation: 'modal' }} />
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
  markBoot('direction');
  if (variant === 1) return <View style={{ flex: 1 }}>{children}</View>; // launch experiment: no direction style
  return <View style={{ flex: 1, direction: instance.language === 'dv' ? 'rtl' : 'ltr' }}>{children}</View>;
}

markBoot('layout');

/** Expo Router shows this instead of closing the app when a screen throws while rendering. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => { reportError(error); }, [error]);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }} style={{ flex: 1, backgroundColor: '#141517' }}>
      <RNText style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>Something went wrong</RNText>
      <RNText style={{ color: '#C9CBCF', fontSize: 16, lineHeight: 24 }}>Please copy the text below and send it to support.</RNText>
      <RNText selectable style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 19 }}>{describeError(error)}</RNText>
      <Pressable accessibilityRole="button" onPress={() => void retry()} style={{ minHeight: 52, borderRadius: 26, backgroundColor: '#8EC5F0', alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ color: '#1E2023', fontSize: 17, fontWeight: '700' }}>Try again</RNText>
      </Pressable>
    </ScrollView>
  );
}

// Everything that must happen once per app start lives here, outside the component. Sentry showed the root layout being
// mounted about forty times a minute on a phone; work started from an effect would then run again each time and could feed
// the loop. This runs once however often the layout mounts, and remembers its result.
let startup: Promise<string | null> | null = null;
let startupDone = false;
let startupCrash: string | null = null;
let rootMounts = 0;
let dismissedOnce = false;
function startOnce(): Promise<string | null> {
  startup ??= (async () => {
    void loadAppearance().then(applyStoredAppearance);
    const [, , note] = await Promise.all([loadFlags(), initI18n().then((x) => { markBoot('i18n'); return x; }), readCrashNote()]).catch(() => [null, null, null] as const);
    startupCrash = note ?? null;
    startupDone = true;
    return startupCrash;
  })();
  return startup;
}

function RootLayout() {
  const [ready, setReady] = useState(startupDone);
  const [crash, setCrash] = useState<string | null>(startupCrash);
  const [dismissed, setDismissed] = useState(dismissedOnce);
  useEffect(() => { showErrorsHere((message) => { setCrash(message); setDismissed(true); }); return () => showErrorsHere(null); }, []);
  // Thaana Noor for Dhivehi, Nunito Sans for English and numbers. If a font fails to load the app carries on in the system font.
  const [fontsLoaded, fontError] = useFonts({
    ThaanaNoor_Regular: require('../assets/fonts/ThaanaNoor-Regular.ttf'),
    ThaanaNoor_Bold: require('../assets/fonts/ThaanaNoor-Bold.ttf'),
    NunitoSans_400Regular: require('../assets/fonts/NunitoSans_400Regular.ttf'),
    NunitoSans_700Bold: require('../assets/fonts/NunitoSans_700Bold.ttf'),
    SpaceGrotesk_700Bold: require('../assets/fonts/SpaceGrotesk_700Bold.ttf'), // only for the outlined MVR on the panels
  });
  useEffect(() => {
    rootMounts += 1;
    if (rootMounts === 2 || rootMounts === 10) { markBoot(`remount:${rootMounts}`); if (variant !== 2) reportError(new Error(`Root layout mounted ${rootMounts} times in one launch`)); }
    let live = true;
    void startOnce().then((note) => { if (live) { setCrash((c) => c ?? note); setReady(true); } });
    return () => { live = false; };
  }, []);
  useEffect(() => { if (fontsLoaded || fontError) markBoot('fonts'); }, [fontsLoaded, fontError]);
  const stoppedAt = !dismissed && previousBoot && previousBoot !== 'ok' ? previousBoot : null;
  const showingApp = ready && !crash && !stoppedAt;
  useEffect(() => {
    if (!showingApp) return;
    markBoot(`app:${variant}`);
    const id = setTimeout(() => markBoot('ok'), 4000); // alive four seconds after the first real screen: the launch was good
    return () => clearTimeout(id);
  }, [showingApp]);
  // Tell Sentry what the phone knows about the launch that failed (also proves reports from this phone arrive).
  useEffect(() => { if (ready && stoppedAt && variant !== 2 && rootMounts <= 1) reportError(new Error(`Launch stopped after ${stoppedAt}; alive ${previousAlive ?? '?'}s; variant ${previousVariant} (${VARIANTS[previousVariant]})`)); }, [ready, stoppedAt]);
  if (!ready || !(fontsLoaded || fontError)) return null;
  if (crash || stoppedAt) {
    // Shown once after a crash, before any other screen, in plain system text so it cannot fail the same way.
    return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 16 }} style={{ flex: 1, backgroundColor: '#141517' }}>
        <RNText style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>{i18n.t('crash.title')}</RNText>
        <RNText style={{ color: '#C9CBCF', fontSize: 16, lineHeight: 24 }}>{i18n.t('crash.body')}</RNText>
        <RNText selectable style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 19, fontFamily: undefined }}>{`last launch stopped after: ${stoppedAt ?? 'ok'}\nJavaScript was still running for about ${previousAlive ?? '?'} seconds\nthat launch ran variant ${previousVariant}: ${VARIANTS[previousVariant]}\nnext start runs variant ${variant}: ${VARIANTS[variant]}\nlast variant that stayed open: ${lastGoodVariant === null ? 'none yet' : `${lastGoodVariant}: ${VARIANTS[Number(lastGoodVariant)] ?? '?'}`}\nreporting: ${process.env.EXPO_PUBLIC_SENTRY_DSN ? 'on' : 'off (no DSN in this build)'}\nroot layout mounts so far: ${rootMounts}\n${crash ?? '(no error text)'}`}</RNText>
        <Pressable accessibilityRole="button" onPress={() => { void clearCrashNote(); startupCrash = null; dismissedOnce = true; setCrash(null); setDismissed(true); }} style={{ minHeight: 52, borderRadius: 26, backgroundColor: '#8EC5F0', alignItems: 'center', justifyContent: 'center' }}>
          <RNText style={{ color: '#1E2023', fontSize: 17, fontWeight: '700' }}>{i18n.t('crash.continue')}</RNText>
        </Pressable>
      </ScrollView>
    );
  }
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

export default variant === 2 ? RootLayout : wrapRoot(RootLayout);
