import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Field, Group, Money, Row, Screen, Segmented } from '@/components/ui';
import { parseNonNegativeAmount, toInputText, useMonthLabel } from '@/features/transactions/format';
import { useDebts, useReceivables, useTransactions } from '@/features/transactions/hooks';
import { currentBalance, planInput, totalOwed, totalReceivable } from '@/features/debts/logic';
import { planDebts, STRATEGIES } from '@/features/debts/plan';
import { usePlanSettings } from '@/features/debts/settings';
import { monthOf, toISODate } from '@/features/transactions/logic';
import { useColors } from '@/lib/theme';

export default function DebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const monthLabel = useMonthLabel();
  const debts = useDebts().active;
  const receivables = useReceivables().active;
  const transactions = useTransactions();
  const [settings, update] = usePlanSettings();
  const [monthlyText, setMonthlyText] = useState(settings.monthlyLaari > 0 ? toInputText(settings.monthlyLaari) : '');

  const plan = useMemo(
    () => planDebts(planInput(debts, transactions), settings.strategy, settings.monthlyLaari, monthOf(toISODate(new Date()))),
    [debts, transactions, settings.strategy, settings.monthlyLaari],
  );
  const lenderById = useMemo(() => new Map(debts.map((d) => [d.id, d.lender])), [debts]);

  if (debts.length === 0 && receivables.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="receipt-outline"
          title={t('debts.emptyTitle')}
          body={t('debts.emptyBody')}
          actionLabel={t('debts.add')}
          onAction={() => router.push('/debts/debt')}
        />
      </Screen>
    );
  }

  const owed = totalOwed(debts, transactions);
  const note = { fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 } as const;

  return (
    <Screen>
      {debts.length > 0 ? (
        <>
          <Group>
            <Row label={t('debts.totalOwed')} right={<Money laari={owed} bold />} />
            {plan.debtFreeMonth ? (
              <Row label={t('debts.debtFree', { month: monthLabel(plan.debtFreeMonth) })} />
            ) : plan.neverPaysOff ? (
              <Row label={t('debts.neverFree')} />
            ) : null}
          </Group>

          {owed > 0 ? (
            <>
              <Group title={t('debts.plan')}>
                <Segmented
                  options={STRATEGIES.map((value) => ({ value, label: t(`debts.strategies.${value}`) }))}
                  value={settings.strategy}
                  onChange={(strategy) => update({ strategy })}
                />
              </Group>
              <Text style={note}>{t(`debts.strategyNote.${settings.strategy}`)}</Text>
              <Group>
                <Field
                  label={t('debts.monthly')}
                  latin
                  value={monthlyText}
                  onChangeText={(text) => {
                    setMonthlyText(text);
                    const value = parseNonNegativeAmount(text);
                    if (value !== null) update({ monthlyLaari: value });
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </Group>
              <Text style={note}>{plan.raisedToMinimums ? t('debts.raised') : t('debts.monthlyHint')}</Text>
              {plan.payoff.length > 0 ? (
                <Group>
                  {plan.payoff.map((p) => (
                    <Row key={p.id} label={lenderById.get(p.id) ?? ''} value={t('debts.clearedBy', { month: monthLabel(p.month) })} />
                  ))}
                </Group>
              ) : null}
              <Text style={note}>{t('debts.assumptions')}</Text>
            </>
          ) : null}

          <Group>
            {debts.map((debt) => (
              <Row
                key={debt.id}
                label={debt.lender}
                right={<Money laari={currentBalance(debt, transactions)} />}
                chevron
                onPress={() => router.push({ pathname: '/debts/detail', params: { id: debt.id } })}
              />
            ))}
          </Group>
        </>
      ) : null}

      <Group title={t('debts.receivables')}>
        {receivables.length > 0 ? (
          <Row label={t('debts.receivables')} right={<Money laari={totalReceivable(receivables)} bold />} />
        ) : null}
        {receivables.map((r) => (
          <Row
            key={r.id}
            label={r.debtor}
            right={<Money laari={r.amount_laari} />}
            chevron
            onPress={() => router.push({ pathname: '/debts/receivable', params: { id: r.id } })}
          />
        ))}
        <Row label={t('debts.addReceivable')} chevron onPress={() => router.push('/debts/receivable')} />
      </Group>
    </Screen>
  );
}
