import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Chip, Field, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { saveRate } from '@/data/api';
import { useCategories, useExpense, useSadaqah, useWrite } from '@/data/hooks';
import type { NewExpense } from '@/data/types';
import { GIVING_KINDS, type GivingKind } from '@/features/giving/logic';
import { success } from '@/lib/haptics';
import { space, useColors } from '@/theme/tokens';

/** Fix an expense that was entered wrongly: every field can change, and it can be deleted. Giving entries also show their type and recipient. */
export default function EditExpense() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useExpense(id).data;
  const sadaqah = useSadaqah(id).data;
  const categories = useCategories().data ?? [];
  // What the person changed, if anything; otherwise what is stored.
  const [kindEdit, setKindEdit] = useState<GivingKind | null>(null);
  const [recipientEdit, setRecipientEdit] = useState<string | null>(null);
  const kind = kindEdit ?? sadaqah?.kind ?? 'sadaqah';
  const recipient = recipientEdit ?? sadaqah?.recipient_note ?? '';
  const update = useWrite((a: { id: string; e: NewExpense }) => api.updateExpense(a.id, a.e));
  const updateGiving = useWrite((a: { id: string; kind: GivingKind; recipient_note: string | null }) => api.updateSadaqah(a.id, { kind: a.kind, recipient_note: a.recipient_note }));
  const remove = useWrite(api.deleteExpense);

  if (!expense) return <Screen><StackHeader title={t('edit.expenseTitle')} /><Text color={colors.inkMuted}>{t('common.loading')}</Text></Screen>;

  return (
    <Screen>
      <StackHeader title={t('edit.expenseTitle')} />
      <ExpenseForm
        key={expense.id}
        initial={{ amountLaari: expense.amount_laari, currency: expense.currency, rate: String(expense.fx_rate_to_mvr), category_id: expense.category_id, merchant: expense.merchant, date: expense.spent_at, note: expense.note }}
        categories={categories}
        submitLabel={t('common.save')}
        busy={update.isPending}
        onSubmit={async (e) => {
          await update.mutateAsync({ id: expense.id, e });
          if (sadaqah) await updateGiving.mutateAsync({ id: sadaqah.id, kind, recipient_note: recipient.trim() || null });
          if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr);
          success();
          router.back();
        }}
      >
        {sadaqah ? (
          <View style={{ gap: space.sm }}>
            <Text variant="label">{t('giving.type')}</Text>
            <Row style={{ flexWrap: 'wrap' }}>{GIVING_KINDS.map((k) => <Chip key={k} label={t(`giving.kind.${k}`)} selected={k === kind} onPress={() => setKindEdit(k)} />)}</Row>
            <Field label={t('giving.recipient')} hint={t('giving.recipientHint')} value={recipient} onChangeText={setRecipientEdit} />
          </View>
        ) : null}
      </ExpenseForm>
      <Button kind="ghost" icon="trash-outline" label={t('edit.delete')}
        onPress={() => Alert.alert(t('edit.deleteExpenseTitle'), sadaqah ? `${t('edit.deleteExpenseBody')} ${t('edit.deleteGivingNote')}` : t('edit.deleteExpenseBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('edit.delete'), style: 'destructive', onPress: async () => { await remove.mutateAsync(expense.id); router.back(); } },
        ])} />
    </Screen>
  );
}
