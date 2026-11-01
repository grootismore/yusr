import { useCallback, useMemo } from 'react';
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabaseApi } from '@/lib/query/api';
import type { Row, Table } from '@/lib/query/cache';
import { listKey, type SoftDeleteVars, type UpsertVars } from '@/lib/query/client';
import type { Account, AccountType, Category, Kind, Transaction } from './types';

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
            ...input,
            debt_id: null,
            commitment_id: null,
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
