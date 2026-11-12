import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Group, Money, Row, Screen } from '@/components/ui';
import { accountBalance } from '@/features/transactions/logic';
import { useAccounts, useTransactions } from '@/features/transactions/hooks';

export default function AccountsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { active } = useAccounts();
  const transactions = useTransactions();
  return (
    <Screen>
      {active.length === 0 ? (
        <EmptyState title={t('accounts.empty')} actionLabel={t('accounts.new')} onAction={() => router.push('/more/account')} />
      ) : (
        <Group>
          {active.map((account) => (
            <Row
              key={account.id}
              label={account.name}
              right={<Money laari={accountBalance(account, transactions)} />}
              chevron
              onPress={() => router.push({ pathname: '/more/account', params: { id: account.id } })}
            />
          ))}
        </Group>
      )}
    </Screen>
  );
}
