import { View } from 'react-native';
import { i18n } from '@/lib/i18n';
import { useRestartRequired } from '@/lib/restartGate';
import { useColors } from '@/lib/theme';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

/**
 * Covers the whole app after a language change that needs a restart, in both languages (the layout
 * is in between directions, so neither alone is safe to rely on). No button: closing and reopening
 * Yusr is the only way forward, and it clears itself because the direction then matches.
 */
export function RestartGate() {
  const required = useRestartRequired();
  const colors = useColors();
  if (!required) return null;
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1000,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 28,
      }}
    >
      <AppIcon accessible={false} name="refresh-outline" size={44} color={colors.tint} />
      {(['en', 'dv'] as const).map((language) => {
        const t = i18n.getFixedT(language);
        return (
          <View key={language} accessible accessibilityLanguage={language} style={{ gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', writingDirection: language === 'dv' ? 'rtl' : 'ltr' }}>
              {t('settings.restartTitle')}
            </Text>
            <Text style={{ fontSize: 17, color: colors.secondaryText, textAlign: 'center', writingDirection: language === 'dv' ? 'rtl' : 'ltr' }}>
              {t('settings.restartBody')} {t('settings.restartHow')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
