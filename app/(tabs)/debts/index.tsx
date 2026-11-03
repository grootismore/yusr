import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DEPTH, DepthCard } from '@/components/DepthCard';
import { EmptyState, Field, Group, Money, Row, Screen, SectionTitle, Segmented } from '@/components/ui';
import { parseNonNegativeAmount, toInputText, useMonthLabel } from '@/features/transactions/format';
import { useDebts, useReceivables, useRefresh, useTransactions } from '@/features/transactions/hooks';
import { currentBalance, planInput, totalOwed, totalReceivable } from '@/features/debts/logic';
import { planDebts, STRATEGIES } from '@/features/debts/plan';
import { usePlanSettings } from '@/features/debts/settings';
import { monthOf, toISODate } from '@/features/transactions/logic';
import { formatMVR } from '@/lib/money';
import { useColors } from '@/lib/theme';

export default function DebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const monthLabel = useMonthLabel();
  const debts = useDebts().active;
  const receivables = useReceivables().active;
  const transactions = useTransactions();
  const refresh = useRefresh();
  const [settings, update] = usePlanSettings();
  const [monthlyText, setMonthlyText] = useState(settings.monthlyLaari > 0 ? toInputText(settings.monthlyLaari) : '');

  const plan = useMemo(
    () => planDebts(planInput(debts, transactions), settings.strategy, settings.monthlyLaari, monthOf(toISODate(new Date()))),
    [debts, transactions, settings.strategy, settings.monthlyLaari],
  );
  const lenderById = useMemo(() => new Map(debts.map((d) => [d.id, d.lender])), [debts]);

  if (debts.length === 0 && receivables.length === 0) {
    return (
      <Screen title={t('tabs.debts')} refresh={refresh}>
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
  const original = debts.reduce((total, debt) => total + debt.original_laari, 0);
  const note = { fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 } as const;

  return (
    <Screen title={t('tabs.debts')} refresh={refresh}>
      {debts.length > 0 ? (
        <>
          <DepthCard
            lead={t('debts.totalOwed')}
            amount={owed}
            note={plan.debtFreeMonth ? t('debts.debtFree', { month: monthLabel(plan.debtFreeMonth) }) : plan.neverPaysOff ? t('debts.neverFree') : undefined}
            parts={[
              { key: 'paid', label: t('debts.paidSoFar'), laari: Math.max(original - owed, 0), color: DEPTH.paid },
              { key: 'owed', label: t('debts.stillOwed'), laari: owed, color: DEPTH.owed, legend: false },
            ].filter((part) => part.laari > 0)}
            accessibilityLabel={[
              `${t('debts.totalOwed')} ${formatMVR(owed)}`,
              plan.debtFreeMonth ? t('debts.debtFree', { month: monthLabel(plan.debtFreeMonth) }) : plan.neverPaysOff ? t('debts.neverFree') : '',
              `${t('debts.paidSoFar')} ${formatMVR(Math.max(original - owed, 0))}`,
            ]
              .filter(Boolean)
              .join('. ')}
          />

          {owed > 0 ? (
            <>
              <View style={{ gap: 8 }}>
                <SectionTitle>{t('debts.plan')}</SectionTitle>
                <Segmented
                  options={STRATEGIES.map((value) => ({ value, label: t(`debts.strategies.${value}`) }))}
                  value={settings.strategy}
                  onChange={(strategy) => update({ strategy })}
                />
                <Text style={{ ...note, paddingHorizontal: 4 }}>{t(`debts.strategyNote.${settings.strategy}`)}</Text>
              </View>
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
