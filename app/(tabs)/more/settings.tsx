import { Alert, Pressable, Switch, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LANGUAGE_NAMES, type Language, setLanguage } from '@/lib/i18n';
import { usePendingChanges, useProfile, useUpdateProfile } from '@/features/transactions/hooks';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'expo-router';
import { AppIcon } from '@/components/AppIcon';
import { DeletionBanner } from '@/features/account/DeletionBanner';
import { shareMyData } from '@/features/account/hooks';
import { Group, Row, Screen, Segmented } from '@/components/ui';
import { requestReminderPermission } from '@/features/reminders/notifications';
import { setRemindersEnabled, useRemindersEnabled } from '@/features/reminders/preference';
import { confirmAction } from '@/lib/confirm';
import { setHapticsEnabled, useHapticsEnabled } from '@/lib/haptics';
import { useColors } from '@/lib/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { signOut } = useAuth();
  const router = useRouter();
  const pending = usePendingChanges();
  const { privacyMode, hijriAdjustment } = useProfile();
  const updateProfile = useUpdateProfile();
  const remindersOn = useRemindersEnabled();
  const hapticsOn = useHapticsEnabled();

  async function toggleReminders(value: boolean) {
    if (!value) return setRemindersEnabled(false);
    // The system permission prompt appears only here, when the user asks for reminders.
    if (await requestReminderPermission()) setRemindersEnabled(true);
    else Alert.alert(t('settings.remindersOffTitle'), t('settings.remindersOffBody'));
  }

  function confirmSignOut() {
    if (pending === 0) return void signOut();
    // Queued offline writes are wiped on sign-out, so make that explicit.
    confirmAction({
      title: t('settings.pendingTitle'),
      message: t('settings.pendingBody'),
      confirmLabel: t('settings.signOut'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void signOut(),
    });
  }

  async function choose(language: Language) {
    if (language === i18n.language) return;
    const needsRestart = await setLanguage(language);
    if (needsRestart) {
      Alert.alert(t('settings.restartTitle'), t('settings.restartBody'), [{ text: t('settings.ok') }]);
    }
  }

  function exportData() {
    shareMyData().catch(() => Alert.alert(t('settings.exportFailedTitle'), t('settings.exportFailedBody')));
  }

  return (
    <Screen>
      <DeletionBanner />
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
              {selected ? <AppIcon name="checkmark" size={22} color={colors.tint} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Group footer={t('settings.remindersHint')}>
        <Row
          label={t('settings.reminders')}
          right={<Switch accessibilityLabel={t('settings.reminders')} value={remindersOn} onValueChange={toggleReminders} />}
        />
      </Group>
      <Group footer={t('settings.hapticsHint')}>
        <Row
          label={t('settings.haptics')}
          right={<Switch accessibilityLabel={t('settings.haptics')} value={hapticsOn} onValueChange={setHapticsEnabled} />}
        />
      </Group>
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
      <Group title={t('settings.yourData')} footer={t('settings.exportHint')}>
        <Row label={t('settings.export')} chevron onPress={exportData} />
        <Row label={t('settings.deleteAccount')} destructive chevron onPress={() => router.push('/delete-account')} />
      </Group>
      <Group>
        <Row label={t('settings.about')} chevron onPress={() => router.push('/more/about')} />
      </Group>
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <Text style={{ fontSize: 17, color: colors.danger }}>{t('settings.signOut')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
