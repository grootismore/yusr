import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LANGUAGE_NAMES, type Language, setLanguage } from '@/lib/i18n';
import { usePendingChanges, useProfile, useUpdateProfile } from '@/features/transactions/hooks';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Group, Row, Segmented } from '@/components/ui';
import { useColors } from '@/lib/theme';

// Placeholder settings screen: language switcher only (Phase 1).
export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { signOut } = useAuth();
  const pending = usePendingChanges();
  const { privacyMode, hijriAdjustment } = useProfile();
  const updateProfile = useUpdateProfile();

  function confirmSignOut() {
    if (pending === 0) return void signOut();
    // Queued offline writes are wiped on sign-out, so make that explicit.
    Alert.alert(t('settings.pendingTitle'), t('settings.pendingBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  async function choose(language: Language) {
    if (language === i18n.language) return;
    const needsRestart = await setLanguage(language);
    if (needsRestart) {
      Alert.alert(t('settings.restartTitle'), t('settings.restartBody'), [{ text: t('settings.ok') }]);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 }}>
        {t('settings.language')}
      </Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
        {LANGUAGES.map((language, index) => {
          const selected = i18n.language === language;
          return (
            <Pressable
              key={language}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={LANGUAGE_NAMES[language]}
              onPress={() => choose(language)}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                borderTopWidth: index === 0 ? 0 : 0.5,
                borderTopColor: colors.separator,
              }}
            >
              <Text style={{ fontSize: 17, color: colors.text }}>{LANGUAGE_NAMES[language]}</Text>
              {selected ? <Ionicons name="checkmark" size={22} color={colors.tint} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Group footer={t('settings.privacyHint')}>
        <Row
          label={t('settings.privacy')}
          right={<Switch accessibilityLabel={t('settings.privacy')} value={privacyMode} onValueChange={(value) => updateProfile({ privacy_mode: value })} />}
        />
      </Group>
      <Group title={t('settings.hijriAdjust')} footer={t('settings.hijriHint')}>
        <Segmented
          options={[
            { value: '-1', label: t('settings.hijriMinus') },
            { value: '0', label: t('settings.hijriZero') },
            { value: '1', label: t('settings.hijriPlus') },
          ]}
          value={String(hijriAdjustment)}
          onChange={(value) => updateProfile({ hijri_adjustment: Number(value) })}
        />
      </Group>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <Text style={{ fontSize: 17, color: '#C62828' }}>{t('settings.signOut')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
