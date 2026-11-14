import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, PanelArt, Row, Screen } from '@/components/ui';
import { markBoot } from '@/lib/boot';
import { OnboardArt } from '@/features/onboarding/Art';
import { useAuth } from '@/lib/auth';
import { setFlag, useFlag } from '@/lib/flags';
import { WEB_LIMITED } from '@/lib/platform';
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, type Language } from '@/lib/i18n';
import { space, useColors } from '@/theme/tokens';

const PAGES: { key: 'p1' | 'p2' | 'p3' }[] = [{ key: 'p1' }, { key: 'p2' }, { key: 'p3' }];

/** First launch: three short pages, a language choice, then sign-up. Shown once; "I already have an account" goes to sign-in. */
export default function Welcome() {
  markBoot('welcome');
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
    <Screen scroll={false} padded={false} bleed>
      {/* Teal stage with the illustration; the sheet below carries the words and buttons. */}
      <View style={{ flex: 1, backgroundColor: colors.hero, paddingTop: insets.top + space.md, overflow: 'hidden' }}>
        <PanelArt />
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.xl }}>
          <Text variant="title" color={colors.onHero}>{t('app.name')}</Text>
          {last ? null : <Button kind="ghost" label={t('onboarding.skip')} onPress={() => setPage(PAGES.length - 1)} style={{ paddingHorizontal: space.md }} textColor={colors.onHero} />}
        </Row>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <OnboardArt kind={p.key} />
        </View>
      </View>

      <View style={{ backgroundColor: colors.ground, marginTop: -32, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderCurve: 'continuous', padding: space.xl, paddingBottom: Math.max(insets.bottom, space.lg) + space.sm, gap: space.lg }}>
        <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
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
        <Row accessible accessibilityLabel={t('onboarding.page', { n: page + 1, total: PAGES.length })} style={{ justifyContent: 'center', gap: space.sm }}>
          {PAGES.map((_, i) => <View key={i} style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.accent : colors.groundDeep }} />)}
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
