import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { saveRate } from '@/data/api';
import { useCategories, useHousehold, useHouseholdEntries, useWrite } from '@/data/hooks';
import type { HouseholdEntryInput } from '@/features/household/logic';
import { nameOf } from '@/features/household/logic';
import { useAuth } from '@/lib/auth';
import { success } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useColors } from '@/theme/tokens';

/** Change or delete an entry in the shared pot. Anyone in the household can; the latest change wins. */
export default function HouseholdEntryScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id, month } = useLocalSearchParams<{ id: string; month: string }>();
  const data = useHousehold().data;
  const categories = useCategories().data ?? [];
  const entry = useHouseholdEntries(`${month}-01`).data?.find((e) => e.id === id);
  const update = useWrite(api.updateHouseholdEntry);
  const remove = useWrite(api.deleteHouseholdEntry);
  const addExpense = useWrite(api.addExpense);
  const addIncome = useWrite(api.addIncome);
  const { userId } = useAuth();

  if (!entry) return <Screen><StackHeader title={t('household.editTitle')} /><Text color={colors.inkMuted}>{t('common.loading')}</Text></Screen>;
  const income = entry.kind === 'income';

  /** Your own entry goes back to your private records. */
  async function makePrivate() {
    const e = { amount_laari: entry!.amount_laari, currency: entry!.currency, fx_rate_to_mvr: String(entry!.fx_rate_to_mvr), category_id: income ? null : entry!.category_id, merchant: income ? null : entry!.merchant, spent_at: entry!.entry_date, note: entry!.note };
    if (income) await addIncome.mutateAsync(e); else await addExpense.mutateAsync(e);
    await remove.mutateAsync(entry!.id);
    success();
    toast(t('edit.madePrivate'));
    router.back();
  }

  return (
    <Screen>
      <StackHeader title={t('household.editTitle')} />
      <Text color={colors.inkMuted}>{t('household.paidBy', { name: nameOf(data?.members ?? [], entry.user_id) || t('household.former') })}</Text>
      <ExpenseForm
        key={entry.id}
        initial={{ amountLaari: entry.amount_laari, currency: entry.currency, rate: String(entry.fx_rate_to_mvr), category_id: entry.category_id, merchant: entry.merchant, date: entry.entry_date, note: entry.note }}
        income={income}
        categories={categories}
        submitLabel={t('common.save')}
        busy={update.isPending}
        onSubmit={async (e) => {
          const input: HouseholdEntryInput = { kind: entry.kind, amount_laari: e.amount_laari, currency: e.currency, fx_rate_to_mvr: e.fx_rate_to_mvr, category_id: income ? null : e.category_id, merchant: e.merchant, note: e.note, entry_date: e.spent_at };
          await update.mutateAsync({ id: entry.id, input });
          if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr);
          success();
          toast(t('toast.updated'));
          router.back();
        }}
      />
      {entry.user_id === userId ? (
        <Button kind="secondary" icon="lock-closed-outline" label={t('edit.makePrivate')}
          onPress={() => Alert.alert(t('edit.privateTitle'), t('edit.privateBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('edit.makePrivate'), onPress: () => void makePrivate() }])} />
      ) : null}
      <Button kind="ghost" icon="trash-outline" label={t('edit.delete')}
        onPress={() => Alert.alert(t('household.deleteTitle'), t('household.deleteBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('edit.delete'), style: 'destructive', onPress: async () => { await remove.mutateAsync(entry.id); toast(t('toast.deleted')); router.back(); } },
        ])} />
    </Screen>
  );
}
