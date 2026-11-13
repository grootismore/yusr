import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, Row, Screen } from '@/components/ui';
import { AuthHeader } from '@/features/auth/AuthParts';
import { useAuth, type AuthErrorKey } from '@/lib/auth';
import { isEmail } from '@/lib/authForm';
import { useColors } from '@/theme/tokens';

const COOLDOWN = 60;

export default function ForgotPassword() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<AuthErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function send() {
    setProblem(null);
    if (!isEmail(email)) { setError(t('auth.emailInvalid')); return; }
    setError(null); setBusy(true);
    const r = await auth.resetPassword(email);
    setBusy(false);
    // A "no such account" answer is never shown: the message is the same either way, so nobody can probe for accounts.
    if (r.error && r.error !== 'generic') { setProblem(r.error); return; }
    setSentTo(email.trim()); setWait(COOLDOWN);
  }

  return (
    <Screen>
      <AuthHeader title={sentTo ? t('forgot.sentTitle') : t('forgot.title')} subtitle={sentTo ? undefined : t('forgot.body')} />
      {sentTo ? (
        <>
          <Card tone="good">
            <Row><Icon name="mail-outline" color={colors.teal} /><Text style={{ flex: 1 }} accessibilityLiveRegion="polite">{t('forgot.sentBody', { email: `⁦${sentTo}⁩` })}</Text></Row>
            <Text variant="small" color={colors.inkMuted}>{t('checkEmail.tip')}</Text>
          </Card>
          <Button kind="secondary" label={t('checkEmail.resend')} disabled={wait > 0 || busy} onPress={send} />
          {wait > 0 ? <Text variant="small" color={colors.inkMuted}>{t('checkEmail.resendIn', { seconds: wait })}</Text> : null}
        </>
      ) : (
        <Card>
          <Field label={t('auth.email')} value={email} onChangeText={(v) => { setEmail(v); setError(null); }} error={error}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={send} />
          {problem ? <Text color={colors.coral} accessibilityLiveRegion="polite">{t(`auth.errors.${problem}`)}</Text> : null}
          <Button label={t('forgot.send')} onPress={send} loading={busy} />
        </Card>
      )}
      <View style={{ alignItems: 'flex-start' }}>
        <Button kind="ghost" icon="arrow-back" label={t('forgot.back')} onPress={() => router.replace('/sign-in')} />
      </View>
    </Screen>
  );
}
