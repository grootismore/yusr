import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Screen } from '@/components/ui';
import { acceptInvite } from '@/data/api';
import { useAuth } from '@/lib/auth';
import { markBoot } from '@/lib/boot';
import { useFlag } from '@/lib/flags';
import { redirectAllowed, resetRedirectGuard, useGate } from '@/lib/gate';
import { WEB_LIMITED } from '@/lib/platform';
import { TOKEN_PATTERN } from '@/features/register/invite';
import { space, useColors } from '@/theme/tokens';
import Consent from './consent';
import Setup from './setup';
import SignIn from './sign-in';
import Welcome from './welcome';

type Phase = { kind: 'checking' } | { kind: 'ask'; who: string } | { kind: 'done'; accepted: boolean } | { kind: 'problem'; key: 'invalid' | 'expired' | 'used' | 'error' };

/** What a signed-out person sees first on a phone: the intro once, then sign-in. */
function SignedOutStart() {
  markBoot('signed-out-start');
  const onboarded = useFlag('onboarded');
  return onboarded ? <SignIn /> : <Welcome />;
}

/** Public page for the person who was invited. The token in the link is the only credential; no account is needed to say yes or no. */
export default function Accept() {
  markBoot('accept');
  const colors = useColors();
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { signedIn } = useAuth();
  const gate = useGate();
  const router = useRouter();
  const tokenOk = !!token && TOKEN_PATTERN.test(token);
  const [fetched, setPhase] = useState<Phase>({ kind: 'checking' });
  const phase: Phase = tokenOk ? fetched : { kind: 'problem', key: 'invalid' };
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tokenOk) return;
    let live = true;
    void acceptInvite(token!, 'check').then((r) => {
      if (!live) return;
      if (r.ok) setPhase({ kind: 'ask', who: r.inviter_name ?? t('accept.someone') });
      else setPhase({ kind: 'problem', key: (['invalid', 'expired', 'used'].includes(r.error ?? '') ? r.error : 'error') as 'invalid' | 'expired' | 'used' | 'error' });
    }).catch(() => live && setPhase({ kind: 'problem', key: 'error' }));
    return () => { live = false; };
  }, [token, tokenOk, t]);

  async function answer(action: 'accept' | 'decline') {
    setBusy(true);
    try {
      const r = await acceptInvite(token!, action);
      setPhase(r.ok ? { kind: 'done', accepted: action === 'accept' } : { kind: 'problem', key: 'error' });
    } finally { setBusy(false); }
  }

  // Opened with no invite token: this is where the router drops anyone whose first screen is unavailable to them
  // (for example a signed-out person on app start). Send them where they belong instead of saying "invalid link".
  if (!token) {
    if (gate.waiting) return null;
    // Signed in but something must happen first: show that screen in place. Redirecting to the tabs here is refused by the
    // router while they are locked, which sent phones bouncing between screens until the app closed.
    if (gate.needsConsent) return <Consent />;
    if (gate.needsSetup) return <Setup />;
    if (signedIn || WEB_LIMITED) {
      const href = signedIn ? (WEB_LIMITED ? '/web-home' : '/(tabs)') : '/sign-in';
      if (redirectAllowed()) return <Redirect href={href} />;
      markBoot('redirect-loop-stopped');
      return (
        <Screen>
          <Card><Text>{t('app.name')}</Text></Card>
          <Button label={t('common.retry')} onPress={() => { resetRedirectGuard(); router.replace(href); }} />
        </Screen>
      );
    }
    // On a phone, a signed-out launch lands here. Show the first screen in place: no navigation happens during launch,
    // because a redirect at that moment left phones on a blank screen.
    return <SignedOutStart />;
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.xxl }}>
        <Text variant="display" color={colors.accent}>{t('app.name')}</Text>
        <Text variant="title">{t('accept.title')}</Text>
      </View>
      {phase.kind === 'checking' ? <Text color={colors.inkMuted}>{t('accept.checking')}</Text> : null}
      {phase.kind === 'ask' ? (
        <Card>
          <Text>{t('accept.body', { who: phase.who })}</Text>
          <Button label={t('accept.accept')} onPress={() => answer('accept')} loading={busy} />
          <Button kind="secondary" label={t('accept.decline')} onPress={() => answer('decline')} disabled={busy} />
        </Card>
      ) : null}
      {phase.kind === 'done' ? <Card tone="good"><Text accessibilityLiveRegion="polite">{t(phase.accepted ? 'accept.accepted' : 'accept.declined')}</Text></Card> : null}
      {phase.kind === 'problem' ? <Card tone="warn"><Text accessibilityLiveRegion="polite">{t(`accept.${phase.key}`)}</Text></Card> : null}
    </Screen>
  );
}
