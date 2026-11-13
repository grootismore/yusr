import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Keypad } from '@/components/Keypad';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Icon, IconButton, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { saveRate } from '@/data/api';
import { useCategories, useCategoryName, useWrite } from '@/data/hooks';
import type { NewExpense } from '@/data/types';
import { formatDate } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { displayAmount } from '@/lib/keypad';
import { parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

const PRESETS = ['50', '100', '250', '500'];

/** Add an expense or income in three calm steps: type the amount on a keypad, fill in the details, see it saved. */
export default function AddExpense() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const catName = useCategoryName();
  const [mode, setMode] = useState<'expense' | 'income'>('expense');
  const [step, setStep] = useState<'amount' | 'details' | 'done'>('amount');
  const [typed, setTyped] = useState('');
  const [saved, setSaved] = useState<NewExpense | null>(null);
  const categories = useCategories().data ?? [];
  const addExpense = useWrite(api.addExpense);
  const addIncome = useWrite(api.addIncome);
  const isIncome = mode === 'income';
  let laari = 0;
  try { laari = typed ? parseAmount(typed) : 0; } catch { laari = 0; }

  if (step === 'done' && saved) {
    const cat = categories.find((c) => c.id === saved.category_id);
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xxl }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="checkmark" size={36} color={colors.onTeal} />
            </View>
          </View>
          <Text variant="title" accessibilityLiveRegion="polite">{t(isIncome ? 'add.savedIncome' : 'add.savedExpense')}</Text>
        </View>
        <Card tone="hero" style={{ alignItems: 'center', padding: space.xl }}>
          <Money laari={saved.amount_laari} currency={saved.currency} prefix={isIncome ? '+' : '−'} variant="display" color={colors.onTeal} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 40, lineHeight: 52 }} />
        </Card>
        <Card>
          {isIncome ? null : <Row style={{ justifyContent: 'space-between' }}><Text color={colors.inkMuted}>{t('expense.category')}</Text><Text>{catName(cat)}</Text></Row>}
          <Row style={{ justifyContent: 'space-between' }}><Text color={colors.inkMuted}>{t('expense.date')}</Text><Text latin>{formatDate(saved.spent_at)}</Text></Row>
        </Card>
        <Button label={t('common.done')} onPress={() => router.back()} />
        <Button kind="ghost" label={t('add.another')} onPress={() => { setTyped(''); setSaved(null); setStep('amount'); }} />
      </Screen>
    );
  }

  if (step === 'details') {
    return (
      <Screen>
        <Row style={{ gap: space.xs }}>
          <IconButton icon={i18n.language === 'dv' ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={() => setStep('amount')} />
          <Text variant="title" style={{ flex: 1 }}>{t('add.details')}</Text>
        </Row>
        <Card tone="hero" style={{ alignItems: 'center' }}>
          <Money laari={laari} prefix={isIncome ? '+' : '−'} variant="display" color={colors.onTeal} />
        </Card>
        <ExpenseForm
          key={mode}
          hideAmount
          initial={{ amountLaari: laari }}
          income={isIncome}
          categories={categories}
          submitLabel={t('common.save')}
          busy={addExpense.isPending || addIncome.isPending}
          onSubmit={async (e) => {
            await (isIncome ? addIncome : addExpense).mutateAsync(e);
            if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr); // prefill next time
            success();
            setSaved(e); setStep('done');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ gap: space.xs }}>
        <IconButton icon="close" label={t('common.cancel')} onPress={() => router.back()} />
        <Text variant="title" style={{ flex: 1 }}>{t(isIncome ? 'income.addTitle' : 'expense.addTitle')}</Text>
      </Row>
      <Row style={{ justifyContent: 'center' }}>
        <Chip label={t('add.expense')} selected={!isIncome} onPress={() => setMode('expense')} />
        <Chip label={t('add.income')} selected={isIncome} onPress={() => setMode('income')} />
      </Row>
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
        <Text color={colors.inkMuted}>{t('add.howMuch')}</Text>
        <Text latin variant="display" numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite" style={{ fontSize: 48, lineHeight: 60, writingDirection: 'ltr' }}>
          {'MVR '}{displayAmount(typed)}
        </Text>
      </View>
      <Row style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {PRESETS.map((p) => <Chip key={p} label={p} selected={typed === p} onPress={() => setTyped(p)} />)}
      </Row>
      <Keypad value={typed} onChange={setTyped} />
      <Button label={t('add.next')} disabled={laari <= 0} onPress={() => setStep('details')} />
    </Screen>
  );
}
