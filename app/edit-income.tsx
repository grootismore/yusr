import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
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
      <Button kind="ghost" icon="trash-outline" label={t('edit.delete')}
        onPress={() => Alert.alert(t('income.deleteTitle'), t('edit.deleteIncomeBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('edit.delete'), style: 'destructive', onPress: async () => { await remove.mutateAsync(row.id); toast(t('toast.deleted')); router.back(); } },
        ])} />
    </Screen>
  );
}
