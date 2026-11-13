import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Keypad } from '@/components/Keypad';
import { Text } from '@/components/Text';
import { Button, Chip, Icon, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite } from '@/data/hooks';
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
  const save = useWrite((l: number) => api.setBudget(monthStart(), null, l));
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (typed) {
      try {
        const l = parseAmount(typed);
        if (l <= 0) throw new Error('x');
        await save.mutateAsync(l);
      } catch { setError(t('expense.invalidAmount')); return; }
    }
    success();
    await setFlag('setupDone', true);
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
        <Button kind="ghost" label={t('setup.skip')} onPress={() => void setFlag('setupDone', true)} />
        <Row style={{ justifyContent: 'center' }}>
          <Icon name="scan" size={18} color={colors.accent} />
          <Text variant="small" color={colors.inkMuted} style={{ flex: 1 }}>{t('setup.tip')}</Text>
        </Row>
      </View>
    </Screen>
  );
}
