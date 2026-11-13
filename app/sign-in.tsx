import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/theme/tokens';

export default function SignIn() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null); setInfo(null);
    const r = mode === 'in' ? await auth.signIn(email, password) : await auth.signUp(email, password);
    setBusy(false);
    if (r.error) setError(t(`auth.errors.${r.error}`));
    else if (r.needsEmailConfirmation) { setInfo(t('auth.confirmEmail')); setMode('in'); }
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.xxl }}>
        <Text variant="display" color={colors.teal}>{t('app.name')}</Text>
        <Text variant="title">{t('auth.welcome')}</Text>
        <Text color={colors.inkMuted}>{t('auth.tagline')}</Text>
      </View>
      <Card>
        <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'in' ? 'current-password' : 'new-password'} textContentType={mode === 'in' ? 'password' : 'newPassword'} error={error} />
        {info ? <Text color={colors.teal} accessibilityLiveRegion="polite">{info}</Text> : null}
        <Button label={mode === 'in' ? t('auth.signIn') : t('auth.signUp')} onPress={submit} loading={busy} disabled={!email || !password} />
        <Button kind="ghost" label={mode === 'in' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')} onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); }} />
      </Card>
      {Platform.OS === 'ios' ? <Button kind="secondary" icon="logo-apple" label={t('auth.apple')} onPress={async () => { const r = await auth.signInWithApple(); if (r.error) setError(t(`auth.errors.${r.error}`)); }} /> : null}
    </Screen>
  );
}
