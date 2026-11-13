import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useConsents } from '@/data/hooks';
import { useAuth } from '@/lib/auth';
import { CONSENT_KINDS, LEGAL_VERSION, type ConsentKind } from '@/features/legal/consent';
import { space, useColors } from '@/theme/tokens';

/**
 * Shown to anyone who has not agreed to the current Terms, Privacy Policy and 18+ confirmation, however
 * they signed in (email, Apple or a link), and again whenever LEGAL_VERSION changes. Three separate,
 * unticked switches; nothing is recorded until they are all on and the person taps Continue.
 */
export default function Consent() {
  const colors = useColors();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const updated = (useConsents(true).data?.length ?? 0) > 0; // they agreed to an older version before
  const [on, setOn] = useState<Record<ConsentKind, boolean>>({ terms: false, privacy: false, age_18: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const base = process.env.EXPO_PUBLIC_LEGAL_URL?.replace(/\/$/, '');
  const open = (path: string) => (base ? void Linking.openURL(`${base}/${path}`) : setError(true));
  const all = on.terms && on.privacy && on.age_18;

  async function submit() {
    setBusy(true); setError(false);
    try {
      await api.acceptConsents(CONSENT_KINDS, LEGAL_VERSION);
      await qc.invalidateQueries({ queryKey: ['consents'] });
    } catch { setError(true); } finally { setBusy(false); }
  }

  const rows: [ConsentKind, string][] = [['terms', t('legal.terms')], ['privacy', t('legal.privacy')], ['age_18', t('legal.age')]];
  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.xxl }}>
        <Text variant="display" color={colors.teal}>{t('app.name')}</Text>
        <Text variant="title">{updated ? t('legal.updated') : t('legal.title')}</Text>
        <Text color={colors.inkMuted}>{t('legal.intro')}</Text>
      </View>
      <Card>
        {rows.map(([k, label]) => (
          <Row key={k} style={{ minHeight: 52 }}>
            <Text style={{ flex: 1 }}>{label}</Text>
            <Switch accessibilityLabel={label} value={on[k]} onValueChange={(v) => setOn({ ...on, [k]: v })} trackColor={{ true: colors.teal, false: colors.control }} />
          </Row>
        ))}
        <Row style={{ flexWrap: 'wrap' }}>
          <Button kind="ghost" label={t('legal.readTerms')} onPress={() => open('terms')} />
          <Button kind="ghost" label={t('legal.readPrivacy')} onPress={() => open('privacy')} />
        </Row>
        {error ? <Text variant="small" color={colors.coral} accessibilityLiveRegion="polite">{base ? t('legal.failed') : t('legal.urlMissing')}</Text> : null}
      </Card>
      <Button label={t('legal.continue')} disabled={!all} loading={busy} onPress={submit} />
      <Button kind="ghost" label={t('legal.signOut')} onPress={() => void signOut()} />
    </Screen>
  );
}
