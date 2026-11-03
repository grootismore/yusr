import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppIcon, type IconName } from '@/components/AppIcon';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { finishOnboarding } from '@/features/onboarding/state';
import { selectionHaptic } from '@/lib/haptics';
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, type Language } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

type Step = { key: 'welcome' | 'language' | 'privacy' | 'start'; icon: IconName; points: readonly string[] };

// Four short screens, skippable at any point (HIG: onboarding). Nothing is asked for here and
// nothing is saved except that the intro was seen; sign-in comes straight after.
const STEPS: readonly Step[] = [
  { key: 'welcome', icon: 'wallet-outline', points: [] },
  { key: 'language', icon: 'language-outline', points: [] },
  { key: 'privacy', icon: 'shield-checkmark-outline', points: ['noTracking', 'encrypted', 'contacts', 'adults'] },
  { key: 'start', icon: 'checkmark-circle', points: ['record', 'offline', 'guidance'] },
];

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  async function choose(language: Language) {
    if (language === i18n.language) return;
    selectionHaptic();
    await setLanguage(language); // a layout change covers the app with the restart screen
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 72, gap: 20, alignItems: 'center' }}>
        <LinearGradient
          colors={['#0D4E3A', '#13705F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppIcon accessible={false} name={step.icon} size={44} color="#F3FBF7" />
        </LinearGradient>
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
          {t(`onboarding.${step.key}.title`)}
        </Text>
        {step.key === 'welcome' ? (
          <Text style={{ fontSize: 17, color: colors.secondaryText, textAlign: 'center' }}>{t('onboarding.welcome.body')}</Text>
        ) : null}
        {step.key === 'language' ? (
          <View style={{ alignSelf: 'stretch', gap: 12 }}>
            {LANGUAGES.map((language) => {
              const selected = i18n.language === language;
              return (
                <Pressable
                  key={language}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => void choose(language)}
                  style={{
                    minHeight: 56,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: selected ? colors.tint : colors.separator,
                    backgroundColor: colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>{LANGUAGE_NAMES[language]}</Text>
                  {selected ? <AppIcon accessible={false} name="checkmark-circle" size={24} color={colors.tint} /> : null}
                </Pressable>
              );
            })}
            <Text style={{ fontSize: 15, color: colors.secondaryText, textAlign: 'center' }}>
              {t('onboarding.language.hint')}
            </Text>
          </View>
        ) : null}
        {step.points.length > 0 ? (
          <View style={{ alignSelf: 'stretch', gap: 14 }}>
            {step.points.map((point) => (
              <View key={point} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <AppIcon accessible={false} name="checkmark" size={20} color={colors.tint} />
                <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>{t(`onboarding.${step.key}.${point}`)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ padding: 24, gap: 8 }}>
        <Text
          accessibilityLabel={t('onboarding.stepOf', { current: index + 1, total: STEPS.length })}
          style={{ fontSize: 13, color: colors.secondaryText, textAlign: 'center' }}
        >
          {`${index + 1} / ${STEPS.length}`}
        </Text>
        <Button
          title={t(last ? 'onboarding.getStarted' : 'onboarding.next')}
          onPress={() => (last ? finishOnboarding() : setIndex(index + 1))}
        />
        {last ? null : (
          <Pressable accessibilityRole="button" onPress={finishOnboarding} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, color: colors.secondaryText }}>{t('onboarding.skip')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
