import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Chip, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { saveRate } from '@/data/api';
import { useCategories, useWrite } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { space } from '@/theme/tokens';

/** One Add screen for both kinds of entry: money going out (expense) and money coming in (income). */
export default function AddExpense() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<'expense' | 'income'>('expense');
  const categories = useCategories().data ?? [];
  const addExpense = useWrite(api.addExpense);
  const addIncome = useWrite(api.addIncome);
  const isIncome = mode === 'income';
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t(isIncome ? 'income.addTitle' : 'expense.addTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <View style={{ gap: space.sm }}>
        <Row>
          <Chip label={t('add.expense')} selected={!isIncome} onPress={() => setMode('expense')} />
          <Chip label={t('add.income')} selected={isIncome} onPress={() => setMode('income')} />
        </Row>
      </View>
      <ExpenseForm
        key={mode}
        income={isIncome}
        categories={categories}
        submitLabel={t('common.save')}
        busy={addExpense.isPending || addIncome.isPending}
        onSubmit={async (e) => {
          await (isIncome ? addIncome : addExpense).mutateAsync(e);
          if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr); // prefill next time
          success();
          router.back();
        }}
      />
    </Screen>
  );
}
