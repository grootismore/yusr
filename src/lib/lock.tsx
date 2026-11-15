import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Modal, Platform, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { PinPad } from '@/components/PinPad';
import { Button, Icon } from '@/components/ui';
import { Text } from '@/components/Text';
import { useColors } from '@/theme/tokens';
import { useAuth } from './auth';
import { markBoot } from './boot';
import { getItem, setItem } from './kv';
import { PIN_LENGTH, checkPin, clearPin, pinSet, pinWaitSeconds } from './pin';

const KEY = 'kharadhu.biometric';
const RELOCK_AFTER_MS = 30_000;

export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}
export const biometricEnabled = async (): Promise<boolean> => (await getItem(KEY)) === '1';
export const setBiometricEnabled = (on: boolean): Promise<void> => setItem(KEY, on ? '1' : '0');

const lockOn = async (): Promise<boolean> => (await biometricEnabled()) || (await pinSet());

/** Optional app lock: Face ID or fingerprint, a PIN, or both. Locks at launch and after 30 seconds in the background. */
export function LockGate({ children, active }: { children: ReactNode; active: boolean }) {
  markBoot('lock');
  const colors = useColors();
  const { t } = useTranslation();
  const [locked, setLocked] = useState(false);
  const away = useRef<number | null>(null);

  const [hasPin, setHasPin] = useState(false);
  const [bio, setBio] = useState(false);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [wait, setWait] = useState(0);
  const { signOut } = useAuth();

  const open = useCallback(() => { setLocked(false); setPin(''); setWrong(false); }, []);
  const unlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.reason') });
    if (r.success) open();
  }, [t, open]);

  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let cancelled = false;
    const lockNow = async () => {
      const [b, p] = [await biometricEnabled(), await pinSet()];
      if (cancelled || !(b || p)) return;
      setBio(b); setHasPin(p); setLocked(true);
      if (b) void unlock();
    };
    void lockNow();
    const sub = AppState.addEventListener('change', async (s) => {
      if (s !== 'active') { away.current = Date.now(); return; }
      if (away.current && Date.now() - away.current > RELOCK_AFTER_MS && (await lockOn())) { void lockNow(); }
      away.current = null;
    });
    return () => { cancelled = true; sub.remove(); };
  }, [active, unlock]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    void checkPin(pin).then((ok) => {
      if (ok) { open(); return; }
      setPin(''); setWrong(true); setWait(pinWaitSeconds());
    });
  }, [pin, open]);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(pinWaitSeconds()), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  // Forgot the PIN: signing out clears the lock; signing back in sets the app up fresh on this phone.
  const forgot = () => Alert.alert(t('pin.forgotTitle'), t('pin.forgotBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('pin.forgotConfirm'), style: 'destructive', onPress: async () => { await clearPin(); await setBiometricEnabled(false); await signOut(); open(); } },
  ]);

  // The app stays mounted underneath, so unlocking returns to the same screen. The lock sits in a Modal so it also
  // covers any sheet that was open (a native modal screen would otherwise hide a plain overlay).
  return (
    <>
      <View style={{ flex: 1 }} accessibilityElementsHidden={locked} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>{children}</View>
      <Modal visible={locked} animationType="none" statusBarTranslucent onRequestClose={() => undefined}>
        <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
          <Icon name="lock-closed" size={44} color={colors.accent} />
          <Text variant="title">{t('lock.title')}</Text>
          {hasPin ? (
            <>
              <Text variant="small" color={wrong ? colors.coral : colors.inkMuted}>
                {wait > 0 ? t('pin.wait', { seconds: wait }) : wrong ? t('pin.wrong') : t('pin.enter')}
              </Text>
              <PinPad value={pin} onChange={setPin} disabled={wait > 0} />
              {bio ? <Button label={t('lock.unlock')} kind="ghost" onPress={unlock} /> : null}
              <Button label={t('pin.forgot')} kind="ghost" onPress={forgot} />
            </>
          ) : <Button label={t('lock.unlock')} onPress={unlock} />}
        </View>
      </Modal>
    </>
  );
}
