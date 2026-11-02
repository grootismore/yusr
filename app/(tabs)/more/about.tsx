import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { Text } from '@/components/Text';
import { Group, Row, Screen } from '@/components/ui';
import { GALLERY_TERMS_URL, GALLERY_URL } from '@/features/account/credits';
import { useColors } from '@/lib/theme';

function Credit({ name, credit, license }: { name: string; credit: string; license: string }) {
  const colors = useColors();
  return (
    <View style={{ padding: 16, gap: 4 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{name}</Text>
      <Text style={{ fontSize: 15, color: colors.text }}>{credit}</Text>
      <Text style={{ fontSize: 13, color: colors.secondaryText }}>{license}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Group>
        <Row label={t('about.version')} value={Constants.expoConfig?.version ?? ''} />
      </Group>
      <Group title={t('about.fonts')}>
        <Credit name={t('about.faseyhaName')} credit={t('about.faseyhaCredit')} license={t('about.faseyhaLicense')} />
        <Credit name={t('about.nunitoName')} credit={t('about.nunitoCredit')} license={t('about.nunitoLicense')} />
        <Row label={t('about.openGallery')} chevron onPress={() => void Linking.openURL(GALLERY_URL)} />
        <Row label={t('about.openTerms')} chevron onPress={() => void Linking.openURL(GALLERY_TERMS_URL)} />
      </Group>
    </Screen>
  );
}
