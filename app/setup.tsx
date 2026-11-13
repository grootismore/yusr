import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite } from '@/data/hooks';
import { monthStart } from '@/lib/dates';
import { setFlag } from '@/lib/flags';
import { success } from '@/lib/haptics';
import { parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

/** First run after signing in: one optional question (a monthly budget), then the app. Skipping is always fine. */
export default function Setup() {
  const colors = useColors();
  const { t } = useTranslation();
  const save = useWrite((l: number) => api.setBudget(monthStart(), null, l));
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (text.trim()) {
      try {
        const l = parseAmount(text);
        if (l <= 0) throw new Error('x');
        await save.mutateAsync(l);
      } catch { setError(t('expense.invalidAmount')); return; }
    }
    success();
    await setFlag('setupDone', true);
  }

  return (
    <Screen>
      <View style={{ gap: space.md, paddingTop: space.xxl }}>
        <Text variant="display" color={colors.teal}>{t('app.name')}</Text>
        <Text variant="title">{t('setup.title')}</Text>
        <Text color={colors.inkMuted}>{t('setup.body')}</Text>
      </View>
      <Card>
        <Field label={t('setup.budgetLabel')} hint={t('setup.budgetHint')} value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="0.00" error={error} style={{ fontSize: 24 }} />
        <Button label={t('setup.save')} onPress={submit} loading={save.isPending} />
        <Button kind="ghost" label={t('setup.skip')} onPress={() => void setFlag('setupDone', true)} />
      </Card>
      <Row>
        <Icon name="scan" color={colors.teal} />
        <Text variant="small" color={colors.inkMuted} style={{ flex: 1 }}>{t('setup.tip')}</Text>
      </Row>
    </Screen>
  );
}
