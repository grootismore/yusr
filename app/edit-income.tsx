import { useState } from 'react';
import { confirmDialog } from '@/lib/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { ConvertActions } from '@/components/ConvertActions';
import { Button, Screen, SettingRow, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { saveRate } from '@/data/api';
import { useIncomeRow, useWrite } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useColors } from '@/theme/tokens';

/** Fix income that was entered wrongly: amount, currency and rate, date, note, whether it is kept in its own currency; or delete it. */
export default function EditIncome() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const row = useIncomeRow(id).data;
  const [keep, setKeep] = useState<boolean | null>(null);
  const update = useWrite(api.updateIncome);
  const remove = useWrite(api.deleteIncome);

  if (!row) return <Screen><StackHeader title={t('edit.incomeTitle')} /><Text color={colors.inkMuted}>{t('common.loading')}</Text></Screen>;
  const keepNow = keep ?? row.keep_in_currency;

  return (
    <Screen>
      <StackHeader title={t('edit.incomeTitle')} />
      <ExpenseForm
        key={row.id}
        income
        initial={{ amountLaari: row.amount_laari, currency: row.currency, rate: String(row.fx_rate_to_mvr), date: row.received_at, note: row.note }}
        categories={[]}
        submitLabel={t('common.save')}
        busy={update.isPending}
        onSubmit={async (e) => {
          await update.mutateAsync({ id: row.id, e: { ...e, keep_in_currency: keepNow } });
          if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr);
          success();
          toast(t('toast.updated'));
          router.back();
        }}
      >
        {row.currency !== 'MVR' ? (
          <SettingRow icon="wallet-outline" title={t('foreign.keep', { currency: row.currency })} subtitle={t('foreign.keepNote')} value={keepNow} onValueChange={setKeep} last />
        ) : null}
      </ExpenseForm>
      <ConvertActions source={{ kind: 'income', id: row.id, name: row.note, amountMinor: row.amount_laari, currency: row.currency, fxRate: row.fx_rate_to_mvr, categoryId: null, note: row.note, date: row.received_at }}
        canShare canRepeat removeOriginal={() => remove.mutateAsync(row.id)} />
      <Button kind="ghost" icon="trash-outline" label={t('edit.delete')}
        onPress={async () => { if (await confirmDialog({ title: t('income.deleteTitle'), message: t('edit.deleteIncomeBody'), confirmLabel: t('edit.delete'), cancelLabel: t('common.cancel'), destructive: true })) { await remove.mutateAsync(row.id); toast(t('toast.deleted')); router.back(); } }} />
    </Screen>
  );
}
