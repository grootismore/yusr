import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Msg } from '@/components/Msg';
import { Button, Card, Icon, ProgressBar, Row } from '@/components/ui';
import { useBudgets, useExpenses, useSharedTotals } from '@/data/hooks';
import { budgetState, percentUsed } from '@/lib/budget';
import { monthStart } from '@/lib/dates';
import { space, useColors } from '@/theme/tokens';

/**
 * What the entry just saved means for the month: how much is left of the budget (the bar slides to its new place), or how
 * much has been spent so far when there is no budget. This is the point of logging: seeing where the month stands.
 * Shown only for the current month, and calm when the budget is passed.
 */
export function MonthStanding({ month }: { month: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const expenses = useExpenses(month).data;
  const limit = useBudgets(month).data?.get(null);
  const shared = useSharedTotals(month);
  if (month !== monthStart() || !expenses) return null;
  const spent = expenses.reduce((s, e) => s + e.mvr_laari, 0) + shared.spent;
  if (!limit) {
    return (
      <Card>
        <Msg k="add.spentSoFar" amounts={{ amount: spent }} />
        <Button kind="secondary" label={t('home.setBudget')} onPress={() => router.push('/budget')} />
      </Card>
    );
  }
  const state = budgetState(spent, limit);
  const percent = percentUsed(spent, limit);
  return (
    <Card style={{ gap: space.sm }}>
      <Row>
        <Icon name={state === 'over' ? 'information-circle' : 'checkmark-circle'} color={state === 'over' ? colors.amberDeep : colors.accent} />
        <Msg k={state === 'over' ? 'add.overBudget' : 'add.leftThisMonth'} amounts={{ amount: Math.abs(limit - spent) }} variant="heading" style={{ flex: 1 }} />
      </Row>
      <ProgressBar percent={percent} state={state === 'none' ? 'ok' : state === 'over' ? 'near' : state} label={t('a11y.progress', { percent })} />
      <Msg k="home.ofBudget" amounts={{ budget: limit }} variant="small" color={colors.inkMuted} />
    </Card>
  );
}
