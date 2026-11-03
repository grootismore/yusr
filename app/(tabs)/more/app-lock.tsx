import { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { Stack } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { PinPad } from '@/components/PinPad';
import { Text } from '@/components/Text';
import { Button, Group, Row, Screen } from '@/components/ui';
import { checkPin, clearLock, enableLock, setBiometrics, useLockState } from '@/lib/auth/appLockStore';
import { confirmAction } from '@/lib/confirm';
import { successHaptic, warningHaptic } from '@/lib/haptics';
import { useColors } from '@/lib/theme';

type Step = 'home' | 'consent' | 'create' | 'confirm' | 'verifyChange' | 'verifyOff' | 'bio';

/**
 * Settings for the optional app lock. Nothing is on until the person goes through the explanation
 * and chooses a PIN; Face ID / fingerprint is a second, separate choice with its own explanation
 * (the phone shows its own permission question the first time it is used).
 */
export default function AppLockScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const lock = useLockState();
  const [step, setStep] = useState<Step>('home');
  const [first, setFirst] = useState('');
  const [purpose, setPurpose] = useState<'setup' | 'change'>('setup');
  const [error, setError] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioFailed, setBioFailed] = useState(false);

  useEffect(() => {
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hardware, enrolled]) => setBioAvailable(hardware && enrolled))
      .catch(() => setBioAvailable(false));
  }, []);

  const body = { fontSize: 17, color: colors.text } as const;
  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  async function verify(pin: string, then: () => void) {
    const result = await checkPin(pin);
    if (result.ok) then();
    else {
      warningHaptic();
      setError(result.waitSeconds > 0 ? t('lock.tooMany', { seconds: result.waitSeconds }) : t('lock.wrongPin'));
    }
  }

  async function enableBiometrics() {
    setBioFailed(false);
    // The first call makes the phone ask for Face ID permission; success also proves it works.
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.prompt'), cancelLabel: t('common.cancel'), disableDeviceFallback: true }).catch(() => ({ success: false }));
    if (result.success) {
      await setBiometrics(true);
      successHaptic();
      go('home');
    } else setBioFailed(true);
  }

  if (!lock.loaded) return <Screen>{null}</Screen>;

  let content;
  if (step === 'consent') {
    content = (
      <>
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{t('lock.consentTitle')}</Text>
        <Group>
          {(['consent1', 'consent2', 'consent3'] as const).map((key) => (
            <Row key={key} label={t(`lock.${key}`)} />
          ))}
        </Group>
        <Button title={t('lock.consentButton')} onPress={() => { setPurpose('setup'); go('create'); }} />
        <Button title={t('lock.notNow')} variant="secondary" onPress={() => go('home')} />
      </>
    );
  } else if (step === 'create') {
    content = <PinPad title={t('lock.createPin')} error={error} onComplete={(pin) => { setFirst(pin); go('confirm'); }} />;
  } else if (step === 'confirm') {
    content = (
      <PinPad
        title={t('lock.confirmPin')}
        error={error}
        onComplete={async (pin) => {
          if (pin !== first) {
            warningHaptic();
            setFirst('');
            setStep('create');
            setError(t('lock.pinMismatch'));
            return;
          }
          await enableLock(pin);
          successHaptic();
          go(purpose === 'setup' && bioAvailable ? 'bio' : 'home');
        }}
      />
    );
  } else if (step === 'verifyChange' || step === 'verifyOff') {
    content = (
      <PinPad
        title={t('lock.currentPin')}
        error={error}
        onComplete={(pin) =>
          void verify(pin, () => {
            if (step === 'verifyChange') {
              setPurpose('change');
              go('create');
            } else {
              go('home');
              confirmAction({ title: t('lock.turnOffTitle'), message: t('lock.turnOffBody'), confirmLabel: t('lock.turnOff'), cancelLabel: t('common.cancel'), onConfirm: () => void clearLock() });
            }
          })
        }
      />
    );
  } else if (step === 'bio') {
    content = (
      <>
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{t('lock.bioTitle')}</Text>
        <Text style={body}>{t('lock.bioBody')}</Text>
        {bioFailed ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: colors.danger }}>{t('lock.bioFailed')}</Text> : null}
        <Button title={t('lock.bioUse')} onPress={() => void enableBiometrics()} />
        <Button title={t('lock.notNow')} variant="secondary" onPress={() => go('home')} />
      </>
    );
  } else if (!lock.enabled) {
    content = (
      <>
        <Text style={body}>{t('lock.intro')}</Text>
        <Button title={t('lock.setUp')} onPress={() => go('consent')} />
      </>
    );
  } else {
    content = (
      <>
        <Group footer={bioAvailable ? t('lock.bioHint') : t('lock.bioUnavailable')}>
          <Row
            label={t('lock.bioSwitch')}
            right={
              <Switch
                accessibilityLabel={t('lock.bioSwitch')}
                disabled={!bioAvailable}
                value={lock.biometrics}
                onValueChange={(on) => (on ? go('bio') : void setBiometrics(false))}
              />
            }
          />
        </Group>
        <Group>
          <Row label={t('lock.changePin')} chevron onPress={() => go('verifyChange')} />
        </Group>
        <Group>
          <Row label={t('lock.turnOff')} destructive chevron onPress={() => go('verifyOff')} />
        </Group>
      </>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('lock.appLock'), headerBackVisible: step === 'home' }} />
      {step !== 'home' && step !== 'consent' && step !== 'bio' ? (
        <>
          {content}
          <Button title={t('common.cancel')} variant="secondary" onPress={() => { go('home'); }} />
        </>
      ) : (
        content
      )}
    </Screen>
  );
}
