import { Linking, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Card, Icon, ListRow, Logo, Screen, StackHeader } from '@/components/ui';
import { ltr } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

const LEGAL = process.env.EXPO_PUBLIC_LEGAL_URL?.replace(/\/$/, '');
const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

/** About Kharadhu: what it is, the version, the legal pages, how to reach us, and what it is not. */
export default function About() {
  const colors = useColors();
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '';
  const open = (url: string) => void Linking.openURL(url);
  return (
    <Screen>
      <StackHeader title={t('about.title')} />
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
        <Logo size={88} />
        <Text variant="title">{t('app.name')}</Text>
        <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('about.tagline')}</Text>
        {version ? <Text latin variant="small" color={colors.inkMuted}>{t('about.version', { version: ltr(version) })}</Text> : null}
      </View>

      <Card>
        <Text variant="heading">{t('about.whatTitle')}</Text>
        {(['budget', 'debts', 'giving', 'register', 'raseedhu'] as const).map((k) => (
          <View key={k} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <Icon name={({ budget: 'wallet-outline', debts: 'leaf-outline', giving: 'heart-outline', register: 'shield-checkmark-outline', raseedhu: 'scan-outline' })[k]} color={colors.accent} />
            <Text style={{ flex: 1 }}>{t(`about.${k}`)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text variant="heading">{t('about.privateTitle')}</Text>
        <Text>{t('about.private')}</Text>
        <Text color={colors.inkMuted}>{t('about.notAdvice')}</Text>
      </Card>

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        {LEGAL ? <ListRow icon="document-text-outline" title={t('legal.readTerms')} onPress={() => open(`${LEGAL}/terms`)} /> : null}
        {LEGAL ? <ListRow icon="lock-closed-outline" title={t('legal.readPrivacy')} onPress={() => open(`${LEGAL}/privacy`)} /> : null}
        {SUPPORT ? <ListRow icon="mail-outline" title={t('about.contact')} subtitle={SUPPORT} onPress={() => open(`mailto:${SUPPORT}`)} last /> : null}
        {!LEGAL && !SUPPORT ? <Text color={colors.inkMuted} style={{ paddingVertical: space.md }}>{t('about.linksSoon')}</Text> : null}
      </Card>

      <Text variant="small" color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('about.madeIn')}</Text>
    </Screen>
  );
}
