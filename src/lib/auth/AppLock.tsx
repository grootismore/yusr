import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, View, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { PinPad } from '@/components/PinPad';
import { Text } from '@/components/Text';
import { confirmAction } from '@/lib/confirm';
import { warningHaptic } from '@/lib/haptics';
import { useColors } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { checkPin, loadLock, useLockState, waitSeconds } from './appLockStore';
import { shouldRelock } from './lockLogic';

/**
 * The optional app lock. It is off until the person turns it on in Settings, after reading what it
 * does. When on:
 * - Yusr asks for the PIN (and tries Face ID / fingerprint first if they chose that) on a cold start
 *   and after the app has been in the background for a while.
 * - The screen is covered while the app is not active, so the app-switcher shows nothing.
 * - Face ID is never the only way in: the PIN always works, and "Forgot your PIN?" signs out so the
 *   person can sign in again with their email and password.
 * When off, none of this runs and nothing covers the app.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const lock = useLockState();
  const [locked, setLocked] = useState(true);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>((AppState.currentState as AppStateStatus | null) ?? 'active');
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const backgroundedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  useEffect(() => {
    void loadLock();
  }, []);

  const checkBiometrics = useCallback(() => {
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hardware, enrolled]) => setBioAvailable(hardware && enrolled))
      .catch(() => setBioAvailable(false));
  }, []);
  useEffect(checkBiometrics, [checkBiometrics]);

  // Sign-out, or a fresh password sign-in after startup, needs no unlock.
  // Restoring a stored session at startup (loading -> done) keeps the lock on.
  const [previous, setPrevious] = useState({ session, loading, loaded: lock.loaded, enabled: lock.enabled });
  if (previous.session !== session || previous.loading !== loading || previous.loaded !== lock.loaded || previous.enabled !== lock.enabled) {
    setPrevious({ session, loading, loaded: lock.loaded, enabled: lock.enabled });
    const restoredAtStartup = previous.loading && !loading;
    if (!restoredAtStartup && (!session || !previous.session)) setLocked(false);
    // Turning the lock on from Settings must not lock the person out of the screen they are on.
    if (lock.loaded && previous.loaded && previous.enabled !== lock.enabled) setLocked(false);
    if (lock.loaded && !lock.enabled) setLocked(false);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'background') backgroundedAt.current = Date.now();
      if (next === 'active') {
        if (shouldRelock(backgroundedAt.current, Date.now())) setLocked(true);
        backgroundedAt.current = null;
        checkBiometrics();
      }
    });
    return () => subscription.remove();
  }, [checkBiometrics]);

  const showLock = !!session && lock.loaded && lock.enabled && locked;

  const tryBiometrics = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      // The phone's own passcode is not offered here: Yusr's PIN is the fallback.
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.prompt'), cancelLabel: t('lock.usePin'), disableDeviceFallback: true });
      if (result.success) setLocked(false);
    } catch {
      // The PIN pad is already on screen.
    } finally {
      authenticating.current = false;
    }
  }, [t]);

  useEffect(() => {
    // Starts the system Face ID prompt (an external system); state is set only after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showLock && lock.biometrics && bioAvailable && appState === 'active') void tryBiometrics();
  }, [showLock, lock.biometrics, bioAvailable, appState, tryBiometrics]);

  // After too many wrong tries the pad waits; count it down.
  useEffect(() => {
    if (!showLock) return;
    let cancelled = false;
    const tick = () => waitSeconds().then((s) => !cancelled && setWait(s));
    void tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [showLock]);

  const onPin = useCallback(
    async (pin: string) => {
      const result = await checkPin(pin);
      if (result.ok) {
        setError(null);
        setLocked(false);
      } else {
        warningHaptic();
        setWait(result.waitSeconds);
        setError(result.waitSeconds > 0 ? t('lock.tooMany', { seconds: result.waitSeconds }) : t('lock.wrongPin'));
      }
    },
    [t],
  );

  const forgot = () =>
    confirmAction({
      title: t('lock.forgot'),
      message: t('lock.forgotBody'),
      confirmLabel: t('settings.signOut'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void signOut(),
    });

  // Covered while the settings are read (so content never flashes), and while the app is not active.
  const covered = !!session && (!lock.loaded || (lock.enabled && appState !== 'active'));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} accessibilityElementsHidden={showLock} importantForAccessibility={showLock ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {showLock || covered ? (
        <View
          accessibilityViewIsModal
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}
        >
          {showLock && !covered ? (
            <>
              <PinPad
                title={t('lock.title')}
                message={t('lock.enterPin')}
                error={wait > 0 ? t('lock.tooMany', { seconds: wait }) : error}
                disabled={wait > 0}
                onComplete={(pin) => void onPin(pin)}
              />
              {lock.biometrics && bioAvailable ? (
                <Pressable accessibilityRole="button" onPress={() => void tryBiometrics()} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: colors.tint }}>{t('lock.bioRetry')}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={forgot} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, color: colors.secondaryText }}>{t('lock.forgot')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
