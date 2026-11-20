import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { i18n, initI18n } from '@/lib/i18n';
import { VARIANTS, markBoot, previousAlive, previousBoot, previousVariant, variant } from '@/lib/boot';
import { reportError, wrapRoot } from '@/lib/monitoring';
import { clearCrashNote, describeError, readCrashNote, showErrorsHere } from '@/lib/crashNote';
import { applyStoredAppearance, loadAppearance } from '@/lib/appearance';
import { LockGate } from '@/lib/lock';
import { ToastHost } from '@/lib/toast';
import { DialogHost } from '@/lib/dialog';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CACHE_MAX_AGE, KEEP, persister } from '@/lib/queryCache';
import { CrashScreen } from '@/features/crash/CrashScreen';
import { useZakatReminderSync } from '@/features/giving/useReminderSync';
import { useActivity } from '@/features/register/useActivity';
import { WEB_LIMITED } from '@/lib/platform';
import { useOutboxSync } from '@/lib/useOutboxSync';
import { loadFlags } from '@/lib/flags';
import { loadRuleGroups } from '@/features/rule/store';
import { useGate } from '@/lib/gate';

// No `unstable_settings.anchor` here on purpose. An anchor on a guarded screen (the tabs, for a signed-out person) made the
// router bounce between the anchor and the public fallback forever on phones: a blank screen at launch. The `accept`
// screen sends anyone without an invite token to the right place instead. Covered by src/__tests__/launchReal.test.tsx.

// gcTime must be at least as long as what is kept on the phone, or remembered figures would be dropped on launch.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000, gcTime: CACHE_MAX_AGE } } });
const persistOptions = { persister, maxAge: CACHE_MAX_AGE, buster: '2', dehydrateOptions: { shouldDehydrateQuery: (q: { state: { status: string }; queryKey: readonly unknown[] }) => q.state.status === 'success' && KEEP.has(String(q.queryKey[0])) } };

/** On a phone the last-seen figures are kept on the device, so the app opens and shows them with no signal. */
function Cache({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>{children}</PersistQueryClientProvider>;
}

function Routes() {
  markBoot('routes');
  const pathname = usePathname();
  markBoot(`path:${pathname}`);
  const { signedIn, waiting, needsConsent, needsSetup } = useGate();
  useZakatReminderSync(signedIn && !WEB_LIMITED);
  useActivity(signedIn && !WEB_LIMITED);
  useOutboxSync(signedIn && !WEB_LIMITED);
  useEffect(() => { if (!waiting) hideSplash(); }, [waiting]);
  if (waiting) { markBoot('routes-waiting'); return null; }
  markBoot('routes-stack');
  return (
    <LockGate active={signedIn}>
      <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
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
          <Stack.Screen name="about" />
          <Stack.Screen name="plus" />
          <Stack.Screen name="set-pin" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="convert" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-income" options={{ presentation: 'modal' }} />
          <Stack.Screen name="register" />
          <Stack.Screen name="register-item" options={{ presentation: 'modal' }} />
          <Stack.Screen name="contacts" />
          <Stack.Screen name="contact-invite" options={{ presentation: 'modal' }} />
          <Stack.Screen name="release" />
          <Stack.Screen name="giving" />
          <Stack.Screen name="giving-add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="household" />
          <Stack.Screen name="household-entry" />
          <Stack.Screen name="split" />
          <Stack.Screen name="split-group" />
          <Stack.Screen name="split-sheet" />
          <Stack.Screen name="split-new-group" options={{ presentation: 'modal' }} />
          <Stack.Screen name="split-expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recurring" />
          <Stack.Screen name="recurring-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pools" />
          <Stack.Screen name="pool-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="giving-commitment" options={{ presentation: 'modal' }} />
          <Stack.Screen name="zakat" options={{ presentation: 'modal' }} />
          <Stack.Screen name="debts" />
          <Stack.Screen name="rule" />
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
      <OfflineBanner />
      <ToastHost />
      <DialogHost />
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

// Keep the splash screen up until the first real screen can be drawn, instead of showing a blank page while the app starts.
// It always comes down by itself after eight seconds, so a problem can never leave it stuck.
SplashScreen.setOptions({ fade: true, duration: 250 });
SplashScreen.preventAutoHideAsync().catch(() => undefined);
const hideSplash = (): void => { SplashScreen.hideAsync().catch(() => undefined); };
setTimeout(hideSplash, 8000);

markBoot('layout');

/** Expo Router shows this instead of closing the app when a screen throws while rendering. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => { reportError(error); hideSplash(); }, [error]);
  return <CrashScreen details={describeError(error)} onContinue={() => void retry()} continueLabel={(i18n.isInitialized ? i18n.t('crash.tryAgain') : '') || 'Try again'} />;
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
    const [, , , note] = await Promise.all([loadFlags(), loadRuleGroups(), initI18n().then((x) => { markBoot('i18n'); return x; }), readCrashNote()]).catch(() => [null, null, null, null] as const);
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
  // Thaana Noor for Dhivehi (English and numbers use the phone's own font). If a font fails to load the app carries on in the system font.
  const [fontsLoaded, fontError] = useFonts({
    ThaanaNoor_Regular: require('../assets/fonts/ThaanaNoor-Regular.ttf'),
    ThaanaNoor_Bold: require('../assets/fonts/ThaanaNoor-Bold.ttf'),
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
  const showingApp = ready && !crash;
  useEffect(() => {
    if (!showingApp) return;
    markBoot(`app:${variant}`);
    const id = setTimeout(() => markBoot('ok'), 4000); // alive four seconds after the first real screen: the launch was good
    return () => clearTimeout(id);
  }, [showingApp]);
  // Tell Sentry what the phone knows about the launch that failed (also proves reports from this phone arrive).
  useEffect(() => { if (ready && stoppedAt && variant !== 2 && rootMounts <= 1) reportError(new Error(`Launch stopped after ${stoppedAt}; alive ${previousAlive ?? '?'}s; variant ${previousVariant} (${VARIANTS[previousVariant]})`)); }, [ready, stoppedAt]);
  if (!ready || !(fontsLoaded || fontError)) return null;
  if (crash) {
    hideSplash();
    // After a real error: calm words, a way on, a way to report. The launch notes (what the phone knows about the last start) go in the folded details.
    const details = `last launch stopped after: ${stoppedAt ?? 'ok'}\nJavaScript was still running for about ${previousAlive ?? '?'} seconds\nvariant ${previousVariant}: ${VARIANTS[previousVariant]}\nreporting: ${process.env.EXPO_PUBLIC_SENTRY_DSN ? 'on' : 'off'}\n${crash}`;
    return <CrashScreen details={details} onContinue={() => { void clearCrashNote(); startupCrash = null; dismissedOnce = true; setCrash(null); setDismissed(true); }} />;
  }
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <Cache>
          <AuthProvider>
            <StatusBar style="auto" />
            <Direction><Routes /></Direction>
          </AuthProvider>
        </Cache>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

export default variant === 2 ? RootLayout : wrapRoot(RootLayout);
