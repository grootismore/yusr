import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/lib/theme';

export default function MoreScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <Text style={{ fontSize: 17, color: colors.text }}>{t('more.settings')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
