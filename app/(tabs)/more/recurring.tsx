import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Group, Money, Row, Screen } from '@/components/ui';
import { useFormatDate } from '@/features/transactions/format';
import { useRecurringItems } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';

export default function RecurringScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const formatDate = useFormatDate();
  const { active } = useRecurringItems();
  const today = toISODate(new Date());

  if (active.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="calendar-outline"
          title={t('recurring.empty')}
          body={t('recurring.emptyBody')}
          actionLabel={t('recurring.add')}
          onAction={() => router.push('/more/recurring-item')}
        />
      </Screen>
    );
  }
  return (
    <Screen>
      {[...active]
        .filter((r) => r.active)
        .sort((a, b) => (a.next_due_on < b.next_due_on ? -1 : 1))
        .map((item) => (
          <Group key={item.id}>
            <Row label={item.name} right={<Money laari={item.amount_laari} bold />} />
            <Row label={t('recurring.dueOn', { date: formatDate(item.next_due_on) })} destructive={item.next_due_on < today} />
            <Row label={t('recurring.log')} chevron onPress={() => router.push({ pathname: '/transaction', params: { recurringId: item.id } })} />
            <Row label={t('recurring.edit')} chevron onPress={() => router.push({ pathname: '/more/recurring-item', params: { id: item.id } })} />
          </Group>
        ))}
    </Screen>
  );
}
