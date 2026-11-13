import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCategoryName } from '@/data/hooks';
import type { Category, Expense } from '@/data/types';
import { formatDate } from '@/lib/dates';
import { radius, space, useColors } from '@/theme/tokens';
import { Money } from './Money';
import { Text } from './Text';
import { Icon, Row, type IconName } from './ui';

export function ExpenseRow({ expense, category, hideDate }: { expense: Expense; category?: Category; hideDate?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const catName = useCategoryName();
  const title = expense.merchant || catName(category);
  return (
    <Row accessible accessibilityLabel={`${title}, ${formatDate(expense.spent_at)}${expense.source === 'scan' ? `, ${t('common.scanned')}` : ''}`} style={{ minHeight: 56 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tealWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={(category?.icon ?? 'ellipsis') as IconName} color={colors.teal} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1}>{title}</Text>
        <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
          {hideDate ? null : <Text latin variant="small" color={colors.inkMuted}>{formatDate(expense.spent_at)}</Text>}
          {expense.source === 'scan' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.tealWash }}>
              <Icon name="scan" size={14} color={colors.teal} />
              <Text variant="small" color={colors.teal}>{t('common.scanned')}</Text>
            </View>
          ) : null}
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Money laari={expense.mvr_laari} prefix={'\u2212'} />
        {expense.currency !== 'MVR' ? <Money laari={expense.amount_laari} currency={expense.currency} variant="small" color={colors.inkMuted} /> : null}
      </View>
    </Row>
  );
}
