import { useCallback, useMemo } from 'react';
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabaseApi } from '@/lib/query/supabaseApi';
import type { Row, Table } from '@/lib/query/cache';
import {
  listKey,
  profileKey,
  secretsKey,
  type DebtSecretsVars,
  type ProfileVars,
  type SoftDeleteVars,
  type UpsertVars,
} from '@/lib/query/client';
import type { DebtSecrets } from '@/lib/query/api';
import type { Debt, Receivable } from '@/features/debts/types';
import type { Commitment } from '@/features/giving/types';
import type { Account, AccountType, Category, Kind, RecurringItem, Transaction } from './types';

function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('Data hooks are only available when signed in');
  return session.user.id;
}

function useRows<T extends Row>(table: Table): T[] | undefined {
  const userId = useUserId();
  return useQuery({
    queryKey: listKey(table, userId),
    queryFn: async () => (await supabaseApi.fetchAll(table)) as unknown as T[],
  }).data;
}

const EMPTY: never[] = [];

/** `all` includes archived accounts (for names on old transactions); `active` hides them. */
export function useAccounts() {
  const all = useRows<Account>('accounts') ?? EMPTY;
  return useMemo(() => ({ all, active: all.filter((a) => a.deleted_at === null) }), [all]);
}

export function useCategories() {
  const all = useRows<Category>('categories') ?? EMPTY;
  return useMemo(() => ({ all, active: all.filter((c) => c.deleted_at === null) }), [all]);
}

export function useTransactions(): Transaction[] {
  return useRows<Transaction>('transactions') ?? EMPTY;
}

/** True once the first fetch (or the cache restored from disk) has produced data. */
export function useDataReady(): boolean {
  const userId = useUserId();
  const accounts = useQuery({ queryKey: listKey('accounts', userId), queryFn: () => supabaseApi.fetchAll('accounts') });
  return accounts.data !== undefined;
}

/** Writes made on this device that the server has not confirmed yet (offline queue). */
export const usePendingChanges = (): number => useIsMutating();

function useUpsert(table: Table) {
  const userId = useUserId();
  const { mutate } = useMutation<unknown, unknown, UpsertVars>({ mutationKey: ['upsert'] });
  return useCallback(
    (row: Row & Record<string, unknown>) => mutate({ table, userId, row }),
    [mutate, table, userId],
  );
}

export function useSoftDelete(table: Table) {
  const userId = useUserId();
  const { mutate } = useMutation<unknown, unknown, SoftDeleteVars>({ mutationKey: ['softDelete'] });
  return useCallback(
    (id: string) => mutate({ table, userId, id, at: new Date().toISOString() }),
    [mutate, table, userId],
  );
}

const stamp = () => new Date().toISOString();

export interface AccountInput {
  name: string;
  type: AccountType;
  opening_balance_laari: number;
}

/** Creates (no `existing`) or updates an account. Returns immediately; the write syncs in the background. */
export function useSaveAccount() {
  const userId = useUserId();
  const upsert = useUpsert('accounts');
  return useCallback(
    (input: AccountInput, existing?: Account) => {
      const now = stamp();
      const row: Account = existing
        ? { ...existing, ...input, updated_at: now }
        : { id: Crypto.randomUUID(), user_id: userId, ...input, created_at: now, updated_at: now, deleted_at: null };
      upsert(row as unknown as Row & Record<string, unknown>);
      return row.id;
    },
    [upsert, userId],
  );
}

export interface CategoryInput {
  name: string;
  kind: Kind;
}

/** Custom categories use one name for both languages (the table needs both). */
export function useSaveCategory() {
  const userId = useUserId();
  const upsert = useUpsert('categories');
  return useCallback(
    ({ name, kind }: CategoryInput, existing?: Category) => {
      const now = stamp();
      const row: Category = existing
        ? { ...existing, name_en: name, name_dv: name, kind, updated_at: now }
        : {
            id: Crypto.randomUUID(),
            user_id: userId,
            name_en: name,
            name_dv: name,
            kind,
            is_default: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
      upsert(row as unknown as Row & Record<string, unknown>);
      return row.id;
    },
    [upsert, userId],
  );
}

export interface TransactionInput {
  account_id: string;
  category_id: string;
  amount_laari: number;
  kind: Kind;
  occurred_on: string;
  note: string | null;
  /** Set when this transaction is a payment on a debt, or marks a giving commitment done. */
  debt_id?: string | null;
  commitment_id?: string | null;
}

export function useSaveTransaction() {
  const userId = useUserId();
  const upsert = useUpsert('transactions');
  return useCallback(
    (input: TransactionInput, existing?: Transaction) => {
      const now = stamp();
      const row: Transaction = existing
        ? { ...existing, ...input, updated_at: now }
        : {
            id: Crypto.randomUUID(),
            user_id: userId,
            debt_id: null,
            commitment_id: null,
            ...input,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
      upsert(row as unknown as Row & Record<string, unknown>);
      return row.id;
    },
    [upsert, userId],
  );
}

// ---------------------------------------------------------------- Phase 3

function splitActive<T extends { deleted_at: string | null }>(all: T[]) {
  return { all, active: all.filter((row) => row.deleted_at === null) };
}

export function useDebts() {
  const all = useRows<Debt>('debts') ?? EMPTY;
  return useMemo(() => splitActive(all), [all]);
}
export function useReceivables() {
  const all = useRows<Receivable>('receivables') ?? EMPTY;
  return useMemo(() => splitActive(all), [all]);
}
export function useCommitments() {
  const all = useRows<Commitment>('commitments') ?? EMPTY;
  return useMemo(() => splitActive(all), [all]);
}
export function useRecurringItems() {
  const all = useRows<RecurringItem>('recurring_items') ?? EMPTY;
  return useMemo(() => splitActive(all), [all]);
}

/** Create (no `existing`) or update a row in any table, with a client-generated id. */
function useSaveRow<T extends Row & { user_id: string }, I extends object>(table: Table, create: object = {}) {
  const userId = useUserId();
  const upsert = useUpsert(table);
  return useCallback(
    (input: I, existing?: T) => {
      const now = stamp();
      const row = existing
        ? { ...existing, ...input, updated_at: now }
        : { id: Crypto.randomUUID(), user_id: userId, ...create, ...input, created_at: now, updated_at: now, deleted_at: null };
      upsert(row as unknown as Row & Record<string, unknown>);
      return row.id as string;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upsert, userId],
  );
}

export type DebtInput = Pick<
  Debt,
  'lender' | 'kind' | 'original_laari' | 'balance_laari' | 'min_payment_laari' | 'due_day' | 'is_interest_bearing' | 'interest_rate_bps'
>;
export type ReceivableInput = Pick<Receivable, 'debtor' | 'amount_laari' | 'due_on' | 'notes'>;
export type CommitmentInput = Pick<
  Commitment,
  'type' | 'amount_laari' | 'schedule' | 'due_on' | 'day_of_month' | 'recipient_note' | 'reminder_enabled' | 'active'
>;
export type RecurringInput = Pick<
  RecurringItem,
  'name' | 'kind' | 'amount_laari' | 'category_id' | 'account_id' | 'schedule' | 'day_of_month' | 'weekday' | 'next_due_on' | 'active'
>;

export const useSaveDebt = () =>
  useSaveRow<Debt, DebtInput>('debts', { reference_secret_id: null, notes_secret_id: null });
export const useSaveReceivable = () => useSaveRow<Receivable, ReceivableInput>('receivables');
export const useSaveCommitment = () => useSaveRow<Commitment, CommitmentInput>('commitments');
export const useSaveRecurring = () => useSaveRow<RecurringItem, RecurringInput>('recurring_items');

/** Reference number and notes, decrypted on the server for the owner only. */
export function useDebtSecrets(debtId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: secretsKey(userId, debtId ?? ''),
    enabled: !!debtId,
    queryFn: () => supabaseApi.getDebtSecrets(debtId as string),
  });
}

export function useSaveDebtSecrets() {
  const userId = useUserId();
  const { mutate } = useMutation<unknown, unknown, DebtSecretsVars>({ mutationKey: ['debtSecrets'] });
  return useCallback((debtId: string, secrets: DebtSecrets) => mutate({ userId, debtId, secrets }), [mutate, userId]);
}

export interface ProfileSettings {
  privacyMode: boolean;
  /** Manual correction to Hijri dates, in days. */
  hijriAdjustment: -1 | 0 | 1;
}

export function useProfile(): ProfileSettings {
  const userId = useUserId();
  const { data } = useQuery({ queryKey: profileKey(userId), queryFn: () => supabaseApi.fetchProfile() });
  const adjustment = Number(data?.hijri_adjustment ?? 0);
  return {
    privacyMode: data?.privacy_mode === true,
    hijriAdjustment: adjustment === -1 || adjustment === 1 ? adjustment : 0,
  };
}

export function useUpdateProfile() {
  const userId = useUserId();
  const { mutate } = useMutation<unknown, unknown, ProfileVars>({ mutationKey: ['profileUpdate'] });
  return useCallback((patch: Partial<{ privacy_mode: boolean; hijri_adjustment: number }>) => mutate({ userId, patch }), [mutate, userId]);
}
