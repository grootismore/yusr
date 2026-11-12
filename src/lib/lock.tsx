import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@/components/ui';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';
import { getItem, setItem } from './kv';

const KEY = 'kharadhu.biometric';
const RELOCK_AFTER_MS = 30_000;

export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}
export const biometricEnabled = async (): Promise<boolean> => (await getItem(KEY)) === '1';
export const setBiometricEnabled = (on: boolean): Promise<void> => setItem(KEY, on ? '1' : '0');

/** Optional app lock. Locks at launch and after 30 seconds in the background; no PIN fallback beyond the phone's own. */
export function LockGate({ children, active }: { children: ReactNode; active: boolean }) {
  const { t } = useTranslation();
  const [locked, setLocked] = useState(false);
  const away = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.reason') });
    if (r.success) setLocked(false);
  }, [t]);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let cancelled = false;
    void biometricEnabled().then((on) => { if (on && !cancelled) { setLocked(true); void unlock(); } });
    const sub = AppState.addEventListener('change', async (s) => {
      if (s !== 'active') { away.current = Date.now(); return; }
      if (away.current && Date.now() - away.current > RELOCK_AFTER_MS && (await biometricEnabled())) { setLocked(true); void unlock(); }
      away.current = null;
    });
    return () => { cancelled = true; sub.remove(); };
  }, [active, unlock]);

  if (!locked) return <>{children}</>;
  return (
    <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
      <Icon name="lock-closed" size={44} color={colors.teal} />
      <Text variant="title">{t('lock.title')}</Text>
      <Button label={t('lock.unlock')} onPress={unlock} />
    </View>
  );
}
