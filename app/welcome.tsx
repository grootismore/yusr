import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Chip, Icon, Row, Screen, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { setFlag, useFlag } from '@/lib/flags';
import { WEB_LIMITED } from '@/lib/platform';
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, type Language } from '@/lib/i18n';
import { space, useColors } from '@/theme/tokens';

const PAGES: { icon: IconName; key: 'p1' | 'p2' | 'p3' }[] = [
  { icon: 'receipt-outline', key: 'p1' },
  { icon: 'leaf-outline', key: 'p2' },
  { icon: 'shield-checkmark-outline', key: 'p3' },
];

/** First launch: three short pages, a language choice, then sign-up. Shown once; "I already have an account" goes to sign-in. */
export default function Welcome() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signedIn } = useAuth();
  const onboarded = useFlag('onboarded');
  const [page, setPage] = useState(0);
  if (signedIn) return <Redirect href="/" />;
  if (onboarded || WEB_LIMITED) return <Redirect href="/sign-in" />; // the website skips the intro

  const last = page === PAGES.length - 1;
  const done = async (to: '/sign-in' | '/sign-up') => { await setFlag('onboarded', true); router.replace(to); };
  const p = PAGES[page];

  return (
    <Screen scroll={false}>
      <Row style={{ justifyContent: 'space-between', paddingTop: space.lg }}>
        <Text variant="title" color={colors.teal}>{t('app.name')}</Text>
        {last ? null : <Button kind="ghost" label={t('onboarding.skip')} onPress={() => setPage(PAGES.length - 1)} />}
      </Row>

      <View style={{ flex: 1, justifyContent: 'center', gap: space.xl }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={p.icon} size={44} color={colors.teal} />
        </View>
        <View style={{ gap: space.md }} accessibilityLiveRegion="polite">
          <Text variant="display">{t(`onboarding.${p.key}Title`)}</Text>
          <Text color={colors.inkMuted}>{t(`onboarding.${p.key}Body`)}</Text>
        </View>
        {page === 0 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="label">{t('onboarding.language')}</Text>
            <Row style={{ flexWrap: 'wrap' }}>
              {LANGUAGES.map((l) => <Chip key={l} label={LANGUAGE_NAMES[l]} selected={i18n.language === l} onPress={() => { if (i18n.language !== l) void setLanguage(l as Language); }} />)}
            </Row>
          </View>
        ) : null}
      </View>

      <View style={{ gap: space.md, paddingBottom: space.lg }}>
        <Row accessible accessibilityLabel={t('onboarding.page', { n: page + 1, total: PAGES.length })} style={{ justifyContent: 'center', gap: space.sm }}>
          {PAGES.map((_, i) => <View key={i} style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.teal : colors.sandDeep }} />)}
        </Row>
        {last ? (
          <>
            <Button label={t('onboarding.start')} onPress={() => done('/sign-up')} />
            <Button kind="ghost" label={t('onboarding.haveAccount')} onPress={() => done('/sign-in')} />
          </>
        ) : <Button label={t('onboarding.next')} onPress={() => setPage(page + 1)} />}
      </View>
    </Screen>
  );
}
