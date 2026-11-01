import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, Text, View, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { shouldRelock } from './lockLogic';

/**
 * Biometric / device-credential lock for signed-in users.
 * - Locks on cold start and after AUTO_LOCK_MS in the background.
 * - Covers the screen whenever the app is not active (app-switcher snapshot).
 * - If the device has no screen lock or biometrics enrolled there is nothing to
 *   authenticate with, so the lock is skipped (the device itself is unprotected).
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const [locked, setLocked] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>((AppState.currentState as AppStateStatus | null) ?? 'active');
  const [failed, setFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  const checkAvailability = useCallback(() => {
    LocalAuthentication.getEnrolledLevelAsync()
      .then((level) => setAvailable(level !== LocalAuthentication.SecurityLevel.NONE))
      .catch(() => setAvailable(true)); // fail closed: assume a lock is possible
  }, []);

  useEffect(checkAvailability, [checkAvailability]);

  // Sign-out, or a fresh password sign-in after startup, needs no biometric prompt.
  // Restoring a stored session at startup (loading -> done) keeps the lock on.
  const [previous, setPrevious] = useState({ session, loading });
  if (previous.session !== session || previous.loading !== loading) {
    setPrevious({ session, loading });
    const restoredAtStartup = previous.loading && !loading;
    if (!restoredAtStartup && (!session || !previous.session)) setLocked(false);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'background') backgroundedAt.current = Date.now();
      if (next === 'active') {
        if (shouldRelock(backgroundedAt.current, Date.now())) setLocked(true);
        backgroundedAt.current = null;
        checkAvailability();
      }
    });
    return () => subscription.remove();
  }, [checkAvailability]);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.prompt') });
      if (result.success) setLocked(false);
      setFailed(!result.success);
    } catch {
      setFailed(true);
    } finally {
      authenticating.current = false;
    }
  }, [t]);

  const showLock = !!session && locked && available !== false;

  useEffect(() => {
    // Starts the OS biometric prompt (an external system); state is set only after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showLock && available && appState === 'active') unlock();
  }, [showLock, available, appState, unlock]);

  const covered = !!session && appState !== 'active';

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={showLock}
        importantForAccessibility={showLock ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {showLock || covered ? (
        <View
          accessibilityViewIsModal
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
          }}
        >
          {showLock && !covered ? (
            <>
              <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '600', color: colors.text }}>
                {t('lock.title')}
              </Text>
              {failed ? <Text style={{ color: colors.secondaryText }}>{t('lock.failed')}</Text> : null}
              <Pressable
                accessibilityRole="button"
                onPress={unlock}
                style={{
                  minHeight: 44,
                  minWidth: 160,
                  borderRadius: 12,
                  backgroundColor: colors.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.background }}>{t('lock.unlock')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
