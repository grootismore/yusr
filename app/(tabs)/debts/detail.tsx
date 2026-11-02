import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Group, HeaderTextButton, Money, Row, Screen } from '@/components/ui';
import { bpsToPercentText, useFormatDate } from '@/features/transactions/format';
import { useDebts, useDebtSecrets, useTransactions } from '@/features/transactions/hooks';
import { currentBalance, debtPayments, nextDueDate, paidTotal } from '@/features/debts/logic';
import { toISODate } from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const formatDate = useFormatDate();
  const { all } = useDebts();
  const transactions = useTransactions();
  const debt = all.find((d) => d.id === id);
  const secrets = useDebtSecrets(debt?.id);
  if (!debt) return null;

  const balance = currentBalance(debt, transactions);
  const payments = [...debtPayments(debt.id, transactions)].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1));
  const due = balance > 0 ? nextDueDate(debt.due_day, toISODate(new Date())) : null;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: debt.lender,
          headerRight: () => (
            <HeaderTextButton
              label={t('debts.editTitle')}
              onPress={() => router.push({ pathname: '/debts/debt', params: { id: debt.id } })}
            />
          ),
        }}
      />
      <Group>
        <Row label={t('debts.current')} right={<Money laari={balance} bold />} />
        <Row label={t('debts.original')} right={<Money laari={debt.original_laari} />} />
        <Row label={t('debts.paid')} right={<Money laari={paidTotal(debt.id, transactions)} />} />
        {debt.min_payment_laari > 0 ? <Row label={t('debts.minimum')} right={<Money laari={debt.min_payment_laari} />} /> : null}
        {due ? <Row label={t('debts.nextDue')} value={formatDate(due)} /> : null}
        {debt.is_interest_bearing && debt.interest_rate_bps != null ? (
          <Row label={t('debts.rate')} value={`${bpsToPercentText(debt.interest_rate_bps)}%`} />
        ) : null}
        {secrets.data?.reference_no ? <Row label={t('debts.reference')} value={secrets.data.reference_no} /> : null}
        {secrets.data?.notes ? <Row label={t('debts.notes')} value={secrets.data.notes} /> : null}
      </Group>

      {debt.is_interest_bearing && balance > 0 ? (
        <Text style={{ fontSize: 15, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('debts.nudge')}</Text>
      ) : null}

      {balance > 0 ? (
        <Button title={t('debts.logPayment')} onPress={() => router.push({ pathname: '/transaction', params: { debtId: debt.id } })} />
      ) : (
        <Text accessibilityRole="header" style={{ fontSize: 17, color: colors.text, textAlign: 'center' }}>
          {t('debts.paidOff')}
        </Text>
      )}

      <Group title={t('debts.payments')}>
        {payments.length === 0 ? (
          <Row label={t('debts.noPayments')} />
        ) : (
          payments.map((p) => (
            <Row
              key={p.id}
              label={formatDate(p.occurred_on)}
              right={<Money laari={p.amount_laari} />}
              chevron
              onPress={() => router.push({ pathname: '/transaction', params: { id: p.id } })}
            />
          ))
        )}
      </Group>
    </Screen>
  );
}
