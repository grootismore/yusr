import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useCategories, useWrite } from '@/data/hooks';
import { saveRate } from '@/data/api';

export default function AddExpense() {
  const { t } = useTranslation();
  const router = useRouter();
  const categories = useCategories().data ?? [];
  const add = useWrite(api.addExpense);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('expense.addTitle')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <ExpenseForm
        categories={categories}
        submitLabel={t('common.save')}
        busy={add.isPending}
        onSubmit={async (e) => {
          await add.mutateAsync(e);
          if (e.currency !== 'MVR') await saveRate(e.currency, e.fx_rate_to_mvr); // prefill next time
          router.back();
        }}
      />
    </Screen>
  );
}
