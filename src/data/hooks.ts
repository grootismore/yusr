import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueue } from '@/lib/outbox';
import { isNetworkError } from '@/lib/online';
import * as Crypto from 'expo-crypto';
import { applyOptimistic, opNameOf, withIds } from './queued';
import { toast } from '@/lib/toast';
import { useTranslation } from 'react-i18next';
import { effectiveBudgets } from '@/lib/budget';
import { monthStart } from '@/lib/dates';
import * as api from './api';
import { holdings } from '@/features/foreign/logic';
import type { Category, Expense } from './types';

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: api.listCategories, staleTime: 5 * 60_000 });
export const useExpenses = (month: string) => useQuery({ queryKey: ['expenses', month], queryFn: () => api.listExpenses(month) });
// The rows are what is kept (a Map would not survive being saved on the phone); the limits that apply are worked out from them.
export const useBudgets = (month: string) =>
  useQuery({ queryKey: ['budgets', month], queryFn: () => api.listBudgets(month), select: (rows) => effectiveBudgets(rows, month) });
export const useScansUsed = () => useQuery({ queryKey: ['scans', monthStart()], queryFn: () => api.scansUsed(monthStart()) });
export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
export const useRates = () => useQuery({ queryKey: ['rates'], queryFn: api.getRates });

/** Run a write, then refresh everything it can affect. */
export function useWrite<A, R = unknown>(fn: (a: A) => Promise<R>) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    // A create that cannot get through is kept on the phone and sent later (see queued.ts); everything else fails with a message.
    mutationFn: async (a: A) => {
      const op = opNameOf(fn);
      if (!op) return fn(a);
      const args = withIds(op, a);
      try { return await fn(args); } catch (e) {
        if (!isNetworkError(e)) throw e;
        await enqueue(Crypto.randomUUID(), op, args);
        applyOptimistic(qc, op, args);
        return undefined as R;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => toast(isNetworkError(e) ? t('offline.cantSave') : t('common.saveFailed'), 'error'),
  });
}

export function useCategoryName() {
  const { i18n, t } = useTranslation();
  return (c: Category | undefined | null) => (c ? (i18n.language === 'dv' ? c.name_dv : c.name_en) : t('reports.uncategorised'));
}

export const useDebts = () => useQuery({ queryKey: ['debts'], queryFn: api.listDebts });
export const useDebtPayments = () => useQuery({ queryKey: ['debt-payments'], queryFn: api.listDebtPayments });
export const usePlanSettings = () => useQuery({ queryKey: ['debt-plan'], queryFn: api.getPlanSettings });

export const useCommitments = () => useQuery({ queryKey: ['giving-commitments'], queryFn: api.listCommitments });
export const usePools = () => useQuery({ queryKey: ['pools'], queryFn: api.listPools });
export const usePoolPayments = () => useQuery({ queryKey: ['pool-payments'], queryFn: api.listPoolPayments });
export const useGiving = (month: string) => useQuery({ queryKey: ['giving', month], queryFn: () => api.listGiving(month) });
export const useZakat = (enabled = true) => useQuery({ queryKey: ['zakat'], queryFn: api.getZakat, enabled });

export const useRegisterItems = () => useQuery({ queryKey: ['register-items'], queryFn: api.listRegisterItems });
export const useContacts = () => useQuery({ queryKey: ['contacts'], queryFn: api.listContacts });
export const useCheckin = () => useQuery({ queryKey: ['checkin'], queryFn: api.getCheckin });
export const useAudit = () => useQuery({ queryKey: ['audit'], queryFn: api.listAudit });
export const useContactCases = () => useQuery({ queryKey: ['contact-cases'], queryFn: api.contactCases });

export const useConsents = (enabled: boolean) => useQuery({ queryKey: ['consents'], queryFn: api.listConsents, enabled, staleTime: Infinity });
// The edit screens start from the row already in a list the phone has, so they open with no signal; a fresh copy replaces it when there is one.
function fromLists<T>(qc: ReturnType<typeof useQueryClient>, key: string, pick: (row: any) => T | undefined): T | undefined {
  for (const [, rows] of qc.getQueriesData<unknown[]>({ queryKey: [key] })) for (const r of rows ?? []) { const hit = pick(r); if (hit) return hit; }
  return undefined;
}
export function useExpense(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({ queryKey: ['expense', id], queryFn: () => api.getExpense(id!), enabled: !!id, initialData: () => fromLists<Expense>(qc, 'expenses', (r) => (r.id === id ? r : undefined)), initialDataUpdatedAt: 0 });
}
export function useSadaqah(expenseId: string | undefined) {
  const qc = useQueryClient();
  return useQuery({ queryKey: ['sadaqah', expenseId], queryFn: () => api.getSadaqah(expenseId!), enabled: !!expenseId,
    initialData: () => (fromLists(qc, 'giving', (r) => (r.expense_id === expenseId ? { id: r.id as string, kind: r.kind, recipient_note: r.recipient_note ?? null } : undefined)) ?? undefined), initialDataUpdatedAt: 0 });
}
export function useIncomeRow(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({ queryKey: ['income-row', id], queryFn: () => api.getIncome(id!), enabled: !!id, initialDataUpdatedAt: 0,
    initialData: () => fromLists<api.IncomeFull>(qc, 'income', (r) => (r.id === id ? { ...r, fx_rate_to_mvr: r.fx_rate_to_mvr ?? r.mvr_laari / r.amount_laari, keep_in_currency: r.keep_in_currency ?? false } : undefined)) });
}
/** What is held in each foreign currency, and the exchanges made. */
export function useHoldings() {
  const kept = useQuery({ queryKey: ['kept-income'], queryFn: api.listKeptIncome });
  const conversions = useQuery({ queryKey: ['conversions'], queryFn: api.listConversions });
  const held = useMemo(() => holdings(kept.data ?? [], conversions.data ?? []), [kept.data, conversions.data]);
  return { held, conversions: conversions.data ?? [], loading: kept.isLoading || conversions.isLoading };
}
export const useIncome = (month: string) => useQuery({ queryKey: ['income', month], queryFn: () => api.listIncome(month) });
export const useTrend = (months: string[]) => useQuery({ queryKey: ['trend', months[0], months.length], queryFn: () => api.monthlyTotals(months) });
