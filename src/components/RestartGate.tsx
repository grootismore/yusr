import { View } from 'react-native';
import { i18n } from '@/lib/i18n';
import { useRestartRequired } from '@/lib/restartGate';
import { colors } from '@/theme/tokens';
import { Icon } from './ui';
import { Text } from './Text';

/** Covers the app after a language change that needs a restart, in both languages. No button: reopening the app is the only way forward. */
export function RestartGate() {
  const required = useRestartRequired();
  if (!required) return null;
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 28 }}>
      <Icon name="refresh" size={44} color={colors.teal} />
      {(['dv', 'en'] as const).map((language) => {
        const t = i18n.getFixedT(language);
        return (
          <View key={language} accessible accessibilityLanguage={language} style={{ gap: 6, alignItems: 'center' }}>
            <Text variant="title" style={{ textAlign: 'center', writingDirection: language === 'dv' ? 'rtl' : 'ltr' }}>{t('settings.restartTitle')}</Text>
            <Text color={colors.inkMuted} style={{ textAlign: 'center', writingDirection: language === 'dv' ? 'rtl' : 'ltr' }}>{t('settings.restartBody')} {t('settings.restartHow')}</Text>
          </View>
        );
      })}
    </View>
  );
}
