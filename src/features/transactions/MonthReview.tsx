import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Storage from 'expo-sqlite/kv-store';
import { Group, Money, Row } from '@/components/ui';
import { useMonthLabel } from './format';
import { monthOf, monthSummary, shiftMonth } from './logic';
import type { Transaction } from './types';

const KEY = 'yusr.month-review-hidden';
const readHidden = (): string | null => {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
};

/** The month to look back on: the previous one, during the first week of a new month. */
export const reviewMonth = (today: string): string | null => (Number(today.slice(8, 10)) <= 7 ? shiftMonth(monthOf(today), -1) : null);

/**
 * A plain look back at last month, for the first week of a new one: what came in, went out and was given.
 * Facts only, no scores and no comparisons. Hidden for good (for that month) with one tap.
 */
export function MonthReview({ today, transactions, privacyMode }: { today: string; transactions: readonly Transaction[]; privacyMode: boolean }) {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();
  const [hidden, setHidden] = useState(readHidden);
  const month = reviewMonth(today);
  if (!month || hidden === month) return null;
  const summary = monthSummary(transactions, month);
  if (summary.income + summary.expense + summary.giving === 0) return null;
  return (
    <Group title={t('home.reviewTitle', { month: monthLabel(month) })}>
      <Row label={t('home.income')} right={<Money laari={summary.income} />} />
      <Row label={t('home.expenses')} right={<Money laari={summary.expense} />} />
      <Row label={t('home.giving')} right={<Money laari={summary.giving} hidden={privacyMode} />} />
      <Row label={t('home.net')} right={<Money laari={summary.net} bold hidden={privacyMode} />} />
      <Row
        label={t('home.reviewHide')}
        onPress={() => {
          try {
            Storage.setItemSync(KEY, month);
          } catch {
            // Not remembered: it may show again after a restart, until the week ends.
          }
          setHidden(month);
        }}
      />
    </Group>
  );
}
