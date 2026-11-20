import { useMemo } from 'react';
import { useCategories, useDebtPayments, useExpenses, useIncome, useSharedTotals } from '@/data/hooks';
import { useFlag } from '@/lib/flags';
import { addMonths } from '@/lib/dates';
import { netIncome, ruleSplit, type RuleLine } from './logic';
import { useRuleGroups } from './store';

/** The month's 50/30/20 picture. `enabled` is the person's switch; `lines` is empty until there is income to split. */
export function useRule(month: string): { enabled: boolean; income: number; debtPaid: number; net: number; lines: RuleLine[] } {
  const enabled = useFlag('rule503020') === true;
  const overrides = useRuleGroups();
  const categories = useCategories().data;
  const expenses = useExpenses(month).data;
  const incomeRows = useIncome(month).data;
  const payments = useDebtPayments().data;
  const shared = useSharedTotals(month);
  return useMemo(() => {
    const income = (incomeRows ?? []).reduce((s, i) => s + i.mvr_laari, 0) + shared.income;
    if (!enabled || income <= 0 || !categories) return { enabled, income, debtPaid: 0, net: income, lines: [] };
    const spentBy = new Map<string | null, number>();
    for (const e of expenses ?? []) spentBy.set(e.category_id, (spentBy.get(e.category_id) ?? 0) + e.mvr_laari);
    for (const [id, v] of shared.byCategory) spentBy.set(id, (spentBy.get(id) ?? 0) + v);
    const next = addMonths(month, 1);
    const debtPaid = (payments ?? []).filter((p) => p.paid_on >= month && p.paid_on < next).reduce((s, p) => s + (p.paid_mvr_laari ?? p.amount_laari), 0);
    const net = netIncome(income, debtPaid);
    return { enabled, income, debtPaid, net, lines: net > 0 ? ruleSplit({ income, spentBy, categories, overrides, debtPaid }) : [] };
  }, [enabled, incomeRows, expenses, shared, categories, payments, overrides, month]);
}
