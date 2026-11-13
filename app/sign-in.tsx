import { useRef, useState, type ComponentRef } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, Row, Screen } from '@/components/ui';
import { AuthHeader, Divider, Footer, PasswordField } from '@/features/auth/AuthParts';
import { useAuth, type AuthErrorKey } from '@/lib/auth';
import { isEmail } from '@/lib/authForm';
import { WEB_LIMITED } from '@/lib/platform';
import { space, useColors } from '@/theme/tokens';

export default function SignIn() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [problem, setProblem] = useState<AuthErrorKey | null>(null);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  // The links in our emails land on the website with the result in the address.
  const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : '';
  const failedLink = /error=|error_code=/.test(hash);
  const confirmed = !failedLink && /type=(signup|email)/.test(hash);

  function validEmail(): boolean {
    if (isEmail(email)) return true;
    setErrors((e) => ({ ...e, email: t('auth.emailInvalid') }));
    return false;
  }

  async function submit() {
    setProblem(null); setResent(false);
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = t('auth.emailInvalid');
    if (!password) next.password = t('auth.passwordRequired');
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const r = await auth.signIn(email, password);
    setBusy(false);
    if (r.error === 'invalid') setErrors({ password: t('auth.errors.invalid') });
    else if (r.error) setProblem(r.error);
  }

  async function sendLink() {
    setProblem(null);
    if (!validEmail()) return;
    setBusy(true);
    const r = await auth.signInWithLink(email);
    setBusy(false);
    if (r.error) setProblem(r.error); else setLinkSentTo(email.trim());
  }

  async function resend() {
    setBusy(true);
    const r = await auth.resendConfirmation(email);
    setBusy(false);
    if (r.error) setProblem(r.error); else { setProblem(null); setResent(true); }
  }

  if (linkSentTo) {
    return (
      <Screen>
        <AuthHeader title={t('auth.linkSentTitle')} />
        <Card tone="good">
          <Row><Icon name="mail-outline" color={colors.teal} /><Text style={{ flex: 1 }} accessibilityLiveRegion="polite">{t('auth.linkSentBody', { email: `⁦${linkSentTo}⁩` })}</Text></Row>
        </Card>
        <Button kind="ghost" label={t('auth.useAnotherEmail')} onPress={() => setLinkSentTo(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthHeader title={t('auth.signInTitle')} subtitle={t('auth.signInSubtitle')} />
      {confirmed ? <Card tone="good"><Row><Icon name="checkmark-circle" color={colors.teal} /><Text style={{ flex: 1 }} accessibilityLiveRegion="polite">{t('auth.confirmed')}</Text></Row></Card> : null}
      {failedLink ? <Card tone="warn"><Text accessibilityLiveRegion="polite">{t('auth.linkExpired')}</Text></Card> : null}

      <Card>
        <Field
          label={t('auth.email')} value={email} onChangeText={(v) => { setEmail(v); if (errors.email) setErrors({ ...errors, email: undefined }); }}
          onBlur={() => { if (email) validEmail(); }} error={errors.email}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
          returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordField label={t('auth.password')} value={password} onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }); }}
          error={errors.password} inputRef={passwordRef} returnKeyType="go" onSubmitEditing={submit} />
        <View style={{ alignItems: 'flex-start' }}>
          <Button kind="ghost" label={t('auth.forgotPassword')} onPress={() => router.push({ pathname: '/forgot-password', params: { email } })} />
        </View>

        {problem === 'unconfirmed' ? (
          <Card tone="warn">
            <Text accessibilityLiveRegion="polite">{resent ? t('checkEmail.resent') : t('auth.errors.unconfirmed')}</Text>
            {resent ? null : <Button kind="secondary" label={t('auth.resendConfirmation')} onPress={resend} loading={busy} />}
          </Card>
        ) : problem ? <Text color={colors.coral} accessibilityLiveRegion="polite">{t(`auth.errors.${problem}`)}</Text> : null}

        <Button label={t('auth.signIn')} onPress={submit} loading={busy} />
      </Card>

      <Divider label={t('auth.or')} />
      <View style={{ gap: space.md }}>
        <Button kind="secondary" icon="mail-outline" label={t('auth.magicLink')} onPress={sendLink} disabled={busy} />
        {/* Sideloaded test builds are signed with a free Apple ID, which cannot carry Sign in with Apple, so those builds hide the button. */}
        {Platform.OS === 'ios' && process.env.EXPO_PUBLIC_DISABLE_APPLE_SIGNIN !== '1' ? (
          <Button kind="secondary" icon="logo-apple" label={t('auth.apple')} onPress={async () => { const r = await auth.signInWithApple(); if (r.error) setProblem(r.error); }} />
        ) : null}
      </View>

      {WEB_LIMITED ? null : (
        <Footer>
          <Text color={colors.inkMuted}>{t('auth.noAccount')}</Text>
          <Button kind="ghost" label={t('auth.createLink')} onPress={() => router.replace('/sign-up')} />
        </Footer>
      )}
    </Screen>
  );
}
