import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HouseholdStart } from '@/features/household/Start';
import { setFeature } from '@/features/features/hooks';
import { FeatureSwitches } from '@/features/features/ui';
import { Keypad } from '@/components/Keypad';
import { Text } from '@/components/Text';
import { Button, Chip, Icon, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useHousehold, useWrite } from '@/data/hooks';
import { monthStart } from '@/lib/dates';
import { setFlag } from '@/lib/flags';
import { success } from '@/lib/haptics';
import { displayAmount } from '@/lib/keypad';
import { parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

const PRESETS = ['5000', '10000', '15000', '20000'];

/** First run after signing in: one optional question (a monthly budget) typed on a keypad, then the app. Fits one screen; skipping is always fine. */
export default function Setup() {
  const colors = useColors();
  const { t } = useTranslation();
  const save = useWrite(api.setBudget);
  const [step, setStep] = useState<'who' | 'together' | 'budget' | 'features'>('who');
  const hasHousehold = !!useHousehold().data;
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (typed) {
      try {
        const l = parseAmount(typed);
        if (l <= 0) throw new Error('x');
        await save.mutateAsync({ month: monthStart(), categoryId: null, limit: l });
      } catch { setError(t('expense.invalidAmount')); return; }
    }
    success();
    setStep('features');
  }

  if (step === 'features') {
    return (
      <Screen>
        <View style={{ gap: space.xs, paddingTop: space.md }}>
          <Text variant="heading" color={colors.accent}>{t('app.name')}</Text>
          <Text variant="title" accessibilityRole="header">{t('setup.featuresTitle')}</Text>
          <Text color={colors.inkMuted}>{t('setup.featuresBody')}</Text>
        </View>
        <FeatureSwitches />
        <Button label={t('setup.start')} onPress={() => void setFlag('setupDone', true)} />
      </Screen>
    );
  }

  if (step !== 'budget') {
    return (
      <Screen grow>
        <View style={{ gap: space.xs, paddingTop: space.md }}>
          <Text variant="heading" color={colors.accent}>{t('app.name')}</Text>
          <Text variant="title" accessibilityRole="header">{t('setup.whoTitle')}</Text>
          <Text color={colors.inkMuted}>{t('setup.whoBody')}</Text>
        </View>
        {step === 'who' ? (
          <View style={{ gap: space.md }}>
            <Button label={t('setup.justMe')} icon="person-outline" onPress={() => setStep('budget')} />
            <Button kind="secondary" label={t('setup.together')} icon="people-outline" onPress={() => setStep('together')} />
            <Text variant="small" color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('setup.whoNote')}</Text>
          </View>
        ) : (
          <View style={{ gap: space.lg }}>
            <HouseholdStart onDone={() => { void setFeature('household', true); setStep('budget'); }} />
            <Button kind="ghost" label={hasHousehold ? t('setup.next') : t('setup.skip')} onPress={() => { if (hasHousehold) void setFeature('household', true); setStep('budget'); }} />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen grow>
      <View style={{ gap: space.xs, paddingTop: space.md }}>
        <Text variant="heading" color={colors.accent}>{t('app.name')}</Text>
        <Text variant="title" accessibilityRole="header">{t('setup.title')}</Text>
        <Text color={colors.inkMuted}>{t('setup.body')}</Text>
      </View>

      <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.sm }}>
        <Text variant="small" color={colors.inkMuted}>{t('setup.budgetLabel')}</Text>
        <Text latin variant="display" numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite" style={{ fontSize: 44, lineHeight: 56, writingDirection: 'ltr' }}>
          {'MVR '}{displayAmount(typed)}
        </Text>
        {error ? <Text variant="small" color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : <Text variant="small" color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('setup.budgetHint')}</Text>}
      </View>

      <Row style={{ justifyContent: 'center', gap: space.sm }}>
        {PRESETS.map((p) => <Chip key={p} label={displayAmount(p)} selected={typed === p} onPress={() => { setTyped(p); setError(null); }} />)}
      </Row>
      <Keypad value={typed} onChange={(v) => { setTyped(v); setError(null); }} />

      <View style={{ gap: space.xs, marginTop: 'auto' }}>
        <Button label={t('setup.save')} onPress={submit} loading={save.isPending} />
        <Button kind="ghost" label={t('setup.skip')} onPress={() => setStep('features')} />
        <Row style={{ justifyContent: 'center' }}>
          <Icon name="scan" size={18} color={colors.accent} />
          <Text variant="small" color={colors.inkMuted} style={{ flex: 1 }}>{t('setup.tip')}</Text>
        </Row>
      </View>
    </Screen>
  );
}
