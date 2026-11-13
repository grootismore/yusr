import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { space, useColors } from '@/theme/tokens';

const COOLDOWN = 60;

/** Shown right after sign-up when the email must be confirmed first: what to do next, a resend, and a way back. */
export default function CheckEmail() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [wait, setWait] = useState(COOLDOWN);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function resend() {
    setMsg(null);
    const r = await auth.resendConfirmation(email);
    if (r.error) setMsg({ text: t('checkEmail.failed'), bad: true });
    else { setMsg({ text: t('checkEmail.resent') }); setWait(COOLDOWN); }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'flex-start', gap: space.lg, paddingTop: space.xxl }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail-outline" size={38} color={colors.teal} />
        </View>
        <Text variant="title">{t('checkEmail.title')}</Text>
        <Text>{t('checkEmail.body', { email: `⁦${email}⁩` })}</Text>
        <Text variant="small" color={colors.inkMuted}>{t('checkEmail.tip')}</Text>
      </View>
      <Card>
        <Button label={t('checkEmail.signIn')} onPress={() => router.replace('/sign-in')} />
        <Button kind="secondary" label={t('checkEmail.resend')} disabled={wait > 0} onPress={resend} />
        {wait > 0 ? <Text variant="small" color={colors.inkMuted}>{t('checkEmail.resendIn', { seconds: wait })}</Text> : null}
        {msg ? <Text variant="small" color={msg.bad ? colors.coral : colors.teal} accessibilityLiveRegion="polite">{msg.text}</Text> : null}
        <Button kind="ghost" label={t('checkEmail.change')} onPress={() => router.replace({ pathname: '/sign-in', params: { mode: 'up' } })} />
      </Card>
    </Screen>
  );
}
