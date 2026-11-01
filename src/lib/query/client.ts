import { QueryClient } from '@tanstack/react-query';
import type { RowApi } from './api';
import { applySoftDelete, upsertById, type Row, type Table } from './cache';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Query keys include the user id so one user's cache can never be shown to another. */
export const listKey = (table: Table, userId: string) => [table, userId] as const;

export interface UpsertVars {
  table: Table;
  userId: string;
  /** Full row, including the client-generated id and timestamps for the optimistic cache. */
  row: Row & Record<string, unknown>;
}
export interface SoftDeleteVars {
  table: Table;
  userId: string;
  id: string;
  at: string;
}

const SERVER_OWNED = ['created_at', 'updated_at', 'deleted_at'];
const toPayload = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !SERVER_OWNED.includes(key)));

/** Network failures carry no Postgres error code; rule violations (RLS, constraints) always do. */
export function isTransient(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const code = (error as { code?: unknown } | null)?.code;
  return code === undefined || code === '';
}
const retry = (failureCount: number, error: unknown) => failureCount < 3 && isTransient(error);

/**
 * Offline-first writes. Mutations are keyed ['upsert'] / ['softDelete'] and their
 * functions are registered as client defaults, so a paused mutation restored from
 * disk after an app restart knows how to run. Each one updates the cache
 * optimistically, pauses while offline, and replays in order when back online.
 * Conflict policy: last write wins (the server applies queued writes in order).
 */
export function createQueryClient(api: RowApi): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: WEEK, staleTime: 30_000, refetchOnReconnect: false, retry },
      mutations: { gcTime: WEEK, retry },
    },
  });

  const refreshIfIdle = (table: Table, userId: string) => {
    // Only the last in-flight mutation refetches, so a refetch never clobbers a queued optimistic write.
    if (client.isMutating() === 1) client.invalidateQueries({ queryKey: listKey(table, userId) });
  };

  client.setMutationDefaults(['upsert'], {
    mutationFn: async (vars: unknown) => {
      const { table, row } = vars as UpsertVars;
      await api.upsert(table, toPayload(row));
    },
    onMutate: async (vars: unknown) => {
      const { table, userId, row } = vars as UpsertVars;
      await client.cancelQueries({ queryKey: listKey(table, userId) });
      client.setQueryData<Row[]>(listKey(table, userId), (old) => upsertById(old ?? [], row));
    },
    onError: (_error: unknown, vars: unknown) => {
      const { table, userId } = vars as UpsertVars;
      client.invalidateQueries({ queryKey: listKey(table, userId) }); // roll back to server truth
    },
    onSettled: (_data: unknown, _error: unknown, vars: unknown) => {
      const { table, userId } = vars as UpsertVars;
      refreshIfIdle(table, userId);
    },
  });

  client.setMutationDefaults(['softDelete'], {
    mutationFn: async (vars: unknown) => {
      const { table, id, at } = vars as SoftDeleteVars;
      await api.softDelete(table, id, at);
    },
    onMutate: async (vars: unknown) => {
      const { table, userId, id, at } = vars as SoftDeleteVars;
      await client.cancelQueries({ queryKey: listKey(table, userId) });
      client.setQueryData<Row[]>(listKey(table, userId), (old) => applySoftDelete(table, old ?? [], id, at));
    },
    onError: (_error: unknown, vars: unknown) => {
      const { table, userId } = vars as SoftDeleteVars;
      client.invalidateQueries({ queryKey: listKey(table, userId) });
    },
    onSettled: (_data: unknown, _error: unknown, vars: unknown) => {
      const { table, userId } = vars as SoftDeleteVars;
      refreshIfIdle(table, userId);
    },
  });

  return client;
}
