import { useState } from 'react';
import { confirmDialog } from '@/lib/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { saveRate } from '@/data/api';
import { useCategories, useHousehold, useHouseholdEntries, useWrite } from '@/data/hooks';
import type { HouseholdEntryInput } from '@/features/household/logic';
import { PersonPick } from '@/features/household/PersonPick';
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
  const [whose, setWhose] = useState<string | null>(null);
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
        offerKeep
        initialKeep={entry.keep_in_currency ?? false}
        categories={categories}
        submitLabel={t('common.save')}
        busy={update.isPending}
        onSubmit={async (e) => {
          const input: HouseholdEntryInput = { kind: entry.kind, amount_laari: e.amount_laari, currency: e.currency, fx_rate_to_mvr: e.fx_rate_to_mvr, category_id: income ? null : e.category_id, merchant: e.merchant, note: e.note, entry_date: e.spent_at, keep_in_currency: income ? e.keep_in_currency : undefined, user_id: whose ?? entry.user_id };
          await update.mutateAsync({ id: entry.id, input });
          if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr);
          success();
          toast(t('toast.updated'));
          router.back();
        }}
      >
        <PersonPick label={income ? t('household.whoReceived') : t('household.whoPaidIt')} value={whose ?? entry.user_id} onChange={setWhose} />
      </ExpenseForm>
      {entry.user_id === userId ? (
        <Button kind="secondary" icon="lock-closed-outline" label={t('edit.makePrivate')}
          onPress={async () => { if (await confirmDialog({ title: t('edit.privateTitle'), message: t('edit.privateBody'), confirmLabel: t('edit.makePrivate'), cancelLabel: t('common.cancel') })) void makePrivate(); }} />
      ) : null}
      <Button kind="ghost" icon="trash-outline" label={t('edit.delete')} busyLabel={t('common.deleting')}
        onPress={async () => { if (await confirmDialog({ title: t('household.deleteTitle'), message: t('household.deleteBody'), confirmLabel: t('edit.delete'), cancelLabel: t('common.cancel'), destructive: true })) { await remove.mutateAsync(entry.id); toast(t('toast.deleted')); router.back(); } }} />
    </Screen>
  );
}
