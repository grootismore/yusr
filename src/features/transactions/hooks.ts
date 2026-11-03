import { useCallback, useMemo, useState } from 'react';
import { onlineManager, useIsMutating, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabaseApi } from '@/lib/query/supabaseApi';
import type { Row, Table } from '@/lib/query/cache';
import {
  listKey,
  noteKey,
  type NoteVars,
  profileKey,
  secretsKey,
  type DebtSecretsVars,
  type ProfileVars,
  type SoftDeleteVars,
  type UpsertVars,
} from '@/lib/query/client';
import type { DebtSecrets } from '@/lib/query/api';
import { generateInviteToken, hashInviteToken, inviteExpiry } from '@/features/wasiyyah/invite';
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
> & { started_on?: string | null };
export type ReceivableInput = Pick<Receivable, 'debtor' | 'amount_laari' | 'due_on' | 'notes'>;
export type CommitmentInput = Pick<
  Commitment,
  'type' | 'amount_laari' | 'schedule' | 'due_on' | 'day_of_month' | 'recipient_note' | 'reminder_enabled' | 'active'
> & { name?: string | null };
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

// ---------------------------------------------------------------- Phase 4: Wasiyyah register

export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  inviter_name: string | null;
  email: string;
  phone: string | null;
  status: 'invited' | 'accepted' | 'revoked';
  invite_expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor: 'user' | 'contact' | 'system';
  event: string;
  meta: { contact_id?: string; sections?: string[] };
  created_at: string;
}

const contactsKey = (userId: string) => ['contacts', userId] as const;
const auditKey = (userId: string) => ['audit-log', userId] as const;

export function useContacts() {
  const userId = useUserId();
  const { data } = useQuery({ queryKey: contactsKey(userId), queryFn: async () => (await supabaseApi.fetchContacts()) as unknown as TrustedContact[] });
  const all = data ?? (EMPTY as TrustedContact[]);
  return useMemo(() => ({ all, current: all.filter((c) => c.status !== 'revoked') }), [all]);
}

export function useAuditLog() {
  const userId = useUserId();
  const { data } = useQuery({ queryKey: auditKey(userId), queryFn: async () => (await supabaseApi.fetchAuditLog()) as unknown as AuditEntry[] });
  return data ?? (EMPTY as AuditEntry[]);
}

/**
 * Contact and share changes need the server (an invite link is useless until the row exists, and
 * a share must be recorded), so they run online-only and fail straight away when offline.
 */
function useOnlineAction<V, R>(action: (vars: V) => Promise<R>, refresh: (userId: string) => readonly (readonly unknown[])[]) {
  const userId = useUserId();
  const client = useQueryClient();
  return useMutation<R, unknown, V>({
    networkMode: 'always',
    mutationFn: action,
    onSettled: () => {
      for (const key of refresh(userId)) client.invalidateQueries({ queryKey: key });
    },
  });
}

export interface InviteInput {
  name: string;
  inviterName: string;
  email: string;
  phone: string;
}

/** Creates the contact and resolves with the raw invite token (the one and only time it exists). */
export function useInviteContact() {
  const userId = useUserId();
  const mutation = useOnlineAction<InviteInput, string>(
    async (input) => {
      const token = generateInviteToken();
      await supabaseApi.createContact({
        id: Crypto.randomUUID(),
        user_id: userId,
        name: input.name,
        inviter_name: input.inviterName === '' ? null : input.inviterName,
        email: input.email,
        phone: input.phone === '' ? null : input.phone,
        invite_token_hash: await hashInviteToken(token),
        invite_expires_at: inviteExpiry(),
        consented_at: new Date().toISOString(),
      });
      return token;
    },
    (id) => [contactsKey(id), auditKey(id)],
  );
  return { invite: mutation.mutateAsync, pending: mutation.isPending };
}

export function useRevokeContact() {
  const mutation = useOnlineAction<string, void>((id) => supabaseApi.revokeContact(id), (id) => [contactsKey(id), auditKey(id)]);
  return { revoke: mutation.mutateAsync, pending: mutation.isPending };
}

/** Records that the owner is sharing these sections. Rejects when offline so nothing is shared unrecorded. */
export function useLogRegisterShared() {
  return useOnlineAction<string[], void>((sections) => supabaseApi.logRegisterShared(sections), (id) => [auditKey(id)]).mutateAsync;
}

/** The instruction note (decrypted for its owner). Writes are queued offline like everything else. */
export function useWasiyyahNote() {
  const userId = useUserId();
  const { data } = useQuery({ queryKey: noteKey(userId), queryFn: () => supabaseApi.getWasiyyahNote() });
  return data;
}

export function useSaveWasiyyahNote() {
  const userId = useUserId();
  const { mutate } = useMutation<unknown, unknown, NoteVars>({ mutationKey: ['wasiyyahNote'] });
  return useCallback((note: string) => mutate({ userId, note }), [mutate, userId]);
}

/** Decrypted reference numbers and notes for several debts, by debt id, as they load. */
export function useDebtSecretsMap(debtIds: readonly string[]) {
  const userId = useUserId();
  const results = useQueries({
    queries: debtIds.map((id) => ({ queryKey: secretsKey(userId, id), queryFn: () => supabaseApi.getDebtSecrets(id) })),
  });
  // Rebuilt each render (a handful of entries); callers use it for display, not as an effect dependency.
  return new Map(debtIds.flatMap((id, i) => (results[i]?.data ? [[id, results[i].data as DebtSecrets] as const] : [])));
}

/**
 * Pull to refresh: re-fetches what is on screen from the server. Offline there is nothing to fetch
 * (the device copy is already what is shown), so it finishes at once instead of spinning forever.
 */
export function useRefresh() {
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (onlineManager.isOnline()) {
        const timeout = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 8000);
        });
        await Promise.race([client.refetchQueries({ type: 'active' }), timeout]);
      }
    } catch {
      // The screen keeps showing the device copy; a failed refresh is not an error to report.
    } finally {
      clearTimeout(timer);
      setRefreshing(false);
    }
  }, [client]);
  return { refreshing, onRefresh };
}
