import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, ErrorText, Group, Row, Screen } from '@/components/ui';
import { ConsentList } from '@/features/account/ConsentList';
import { useConsentGate, useRecordConsents } from '@/features/account/hooks';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useColors } from '@/lib/theme';

/**
 * Shown, and nothing else, when the Terms or Privacy Policy changed since the person accepted them.
 * Everything starts unticked. Not accepting is allowed: they can sign out or delete the account.
 */
export default function AcceptTermsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useAuth();
  const { needed } = useConsentGate();
  const record = useRecordConsents();
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState(false);
  const ready = needed.length > 0 && needed.every((kind) => agreed[kind]);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('consent.title'), headerBackVisible: false, gestureEnabled: false }} />
      <Text style={{ fontSize: 17, color: colors.text, paddingHorizontal: 4 }}>{t('consent.intro')}</Text>
      <ConsentList kinds={needed} agreed={agreed} onChange={setAgreed} />
      {failed ? <ErrorText>{t('auth.errors.network')}</ErrorText> : null}
      <Button
        title={t('consent.accept')}
        disabled={!ready}
        busy={record.isPending}
        onPress={() => {
          setFailed(false);
          record.mutate(needed, { onError: () => setFailed(true) });
        }}
      />
      <Text style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 4 }}>{t('consent.else')}</Text>
      <Group>
        <Row label={t('settings.signOut')} chevron onPress={() => void signOut()} />
        <Row label={t('settings.deleteAccount')} destructive chevron onPress={() => router.push('/delete-account')} />
      </Group>
    </Screen>
  );
}
