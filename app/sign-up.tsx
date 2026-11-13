import { useRef, useState, type ComponentRef } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field } from '@/components/ui';
import { AuthScreen, Divider, Footer, PasswordField, PasswordRules } from '@/features/auth/AuthParts';
import { useAuth, type AuthErrorKey } from '@/lib/auth';
import { MIN_PASSWORD, checkPassword, isEmail } from '@/lib/authForm';
import { space, useColors } from '@/theme/tokens';

export default function SignUp() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [problem, setProblem] = useState<AuthErrorKey | null>(null);

  async function submit() {
    setProblem(null);
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = t('auth.emailInvalid');
    if (!checkPassword(password).longEnough) next.password = t('auth.errors.weak', { min: MIN_PASSWORD });
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const r = await auth.signUp(email, password);
    setBusy(false);
    if (r.error === 'exists') setErrors({ email: t('auth.errors.exists') });
    else if (r.error === 'weak') setErrors({ password: t('auth.errors.weak', { min: MIN_PASSWORD }) });
    else if (r.error) setProblem(r.error);
    else if (r.needsEmailConfirmation) router.replace({ pathname: '/check-email', params: { email: email.trim() } });
    // otherwise the session started: the app takes it from here
  }

  return (
    <AuthScreen title={t('auth.signUpTitle')} subtitle={t('auth.signUpSubtitle')}>
      <Card>
        <Field
          label={t('auth.email')} value={email} onChangeText={(v) => { setEmail(v); if (errors.email) setErrors({ ...errors, email: undefined }); }}
          onBlur={() => { if (email && !isEmail(email)) setErrors((e) => ({ ...e, email: t('auth.emailInvalid') })); }} error={errors.email}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
          returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordField label={t('auth.choosePassword')} isNew value={password} onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }); }}
          error={errors.password} inputRef={passwordRef} returnKeyType="go" onSubmitEditing={submit} />
        <PasswordRules password={password} />
        {problem ? <Text color={colors.coral} accessibilityLiveRegion="polite">{t(`auth.errors.${problem}`)}</Text> : null}
        <Button label={t('auth.signUp')} onPress={submit} loading={busy} />
        <Text variant="small" color={colors.inkMuted}>{t('auth.agreeNext')}</Text>
      </Card>

      {Platform.OS === 'ios' && process.env.EXPO_PUBLIC_DISABLE_APPLE_SIGNIN !== '1' ? (
        <View style={{ gap: space.md }}>
          <Divider label={t('auth.or')} />
          <Button kind="secondary" icon="logo-apple" label={t('auth.apple')} onPress={async () => { const r = await auth.signInWithApple(); if (r.error) setProblem(r.error); }} />
        </View>
      ) : null}

      <Footer>
        <Text color={colors.inkMuted}>{t('auth.haveAccount')}</Text>
        <Button kind="ghost" label={t('auth.signInLink')} onPress={() => router.replace('/sign-in')} />
      </Footer>
    </AuthScreen>
  );
}
