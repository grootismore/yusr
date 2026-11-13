import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row } from '@/components/ui';
import { AuthScreen, PasswordField, PasswordRules } from '@/features/auth/AuthParts';
import { useAuth } from '@/lib/auth';
import { MIN_PASSWORD, checkPassword } from '@/lib/authForm';
import { recoverFromUrl, type Recovery } from '@/lib/recovery';
import { useColors } from '@/theme/tokens';

/**
 * Public page the password-reset email opens (on the website). It starts a short session from the link, lets the
 * person choose a new password, then signs them out and sends them back to the app.
 */
export default function ResetPassword() {
  const colors = useColors();
  const { t } = useTranslation();
  const auth = useAuth();
  const [state, setState] = useState<'checking' | Recovery | 'done'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void recoverFromUrl().then(setState); }, []);

  async function save() {
    if (!checkPassword(password).longEnough) { setError(t('auth.errors.weak', { min: MIN_PASSWORD })); return; }
    setError(null); setBusy(true);
    const r = await auth.updatePassword(password);
    setBusy(false);
    if (r.error) { setError(t(`auth.errors.${r.error}`, { min: MIN_PASSWORD })); return; }
    await auth.signOut(); // the reset session is only for this page
    setState('done');
  }

  return (
    <AuthScreen title={t('reset.title')} subtitle={state === 'ready' ? t('reset.body') : undefined}>
      {state === 'checking' ? <Text color={colors.inkMuted}>{t('reset.checking')}</Text> : null}
      {state === 'ready' ? (
        <Card>
          <PasswordField label={t('reset.newPassword')} isNew value={password} onChangeText={(v) => { setPassword(v); setError(null); }} error={error} returnKeyType="go" onSubmitEditing={save} />
          <PasswordRules password={password} />
          <Button label={t('reset.save')} onPress={save} loading={busy} />
        </Card>
      ) : null}
      {state === 'done' ? <Card tone="good"><Row><Icon name="checkmark-circle" color={colors.teal} /><Text style={{ flex: 1 }} accessibilityLiveRegion="polite">{t('reset.done')}</Text></Row></Card> : null}
      {state === 'expired' ? <Card tone="warn"><Text accessibilityLiveRegion="polite">{t('reset.expired')}</Text></Card> : null}
      {state === 'none' ? <Card><Text>{t('reset.none')}</Text></Card> : null}
    </AuthScreen>
  );
}
