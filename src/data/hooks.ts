import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { effectiveBudgets } from '@/lib/budget';
import { monthStart } from '@/lib/dates';
import * as api from './api';
import type { Category } from './types';

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: api.listCategories, staleTime: 5 * 60_000 });
export const useExpenses = (month: string) => useQuery({ queryKey: ['expenses', month], queryFn: () => api.listExpenses(month) });
export const useBudgets = (month: string) =>
  useQuery({ queryKey: ['budgets', month], queryFn: async () => effectiveBudgets(await api.listBudgets(month), month) });
export const useScansUsed = () => useQuery({ queryKey: ['scans', monthStart()], queryFn: () => api.scansUsed(monthStart()) });
export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
export const useRates = () => useQuery({ queryKey: ['rates'], queryFn: api.getRates });

/** Run a write, then refresh everything it can affect. */
export function useWrite<A>(fn: (a: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

export function useCategoryName() {
  const { i18n, t } = useTranslation();
  return (c: Category | undefined | null) => (c ? (i18n.language === 'dv' ? c.name_dv : c.name_en) : t('reports.uncategorised'));
}

export const useDebts = () => useQuery({ queryKey: ['debts'], queryFn: api.listDebts });
export const useDebtPayments = () => useQuery({ queryKey: ['debt-payments'], queryFn: api.listDebtPayments });
export const usePlanSettings = () => useQuery({ queryKey: ['debt-plan'], queryFn: api.getPlanSettings });

export const useGiving = (month: string) => useQuery({ queryKey: ['giving', month], queryFn: () => api.listGiving(month) });
export const useZakat = (enabled = true) => useQuery({ queryKey: ['zakat'], queryFn: api.getZakat, enabled });
