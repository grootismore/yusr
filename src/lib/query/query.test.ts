import { MutationObserver, dehydrate, hydrate, onlineManager, timeoutManager, type QueryClient } from '@tanstack/react-query';
import type { DebtSecrets } from './api';
import { applySoftDelete, upsertById, type Table } from './cache';
import {
  createQueryClient,
  isTransient,
  listKey,
  profileKey,
  secretsKey,
  type DebtSecretsVars,
  type ProfileVars,
  type SoftDeleteVars,
  type UpsertVars,
} from './client';

const fakeApi = () => ({
  fetchAll: jest.fn(async (_table: Table): Promise<Record<string, unknown>[]> => []),
  upsert: jest.fn(async (_table: Table, _row: Record<string, unknown>): Promise<void> => undefined),
  softDelete: jest.fn(async (_table: Table, _id: string, _at: string | null): Promise<void> => undefined),
  getDebtSecrets: jest.fn(async (_debtId: string): Promise<DebtSecrets> => ({ reference_no: '', notes: '' })),
  setDebtSecrets: jest.fn(async (_debtId: string, _secrets: DebtSecrets): Promise<void> => undefined),
  fetchContacts: jest.fn(async (): Promise<Record<string, unknown>[]> => []),
  createContact: jest.fn(async (_row: Record<string, unknown>): Promise<void> => undefined),
  revokeContact: jest.fn(async (_id: string): Promise<void> => undefined),
  getWasiyyahNote: jest.fn(async (): Promise<string> => ''),
  setWasiyyahNote: jest.fn(async (_note: string): Promise<void> => undefined),
  fetchAuditLog: jest.fn(async (): Promise<Record<string, unknown>[]> => []),
  logRegisterShared: jest.fn(async (_sections: string[]): Promise<void> => undefined),
  fetchProfile: jest.fn(async (): Promise<Record<string, unknown> | null> => null),
  updateProfile: jest.fn(async (_patch: Record<string, unknown>): Promise<void> => undefined),
  exportMyData: jest.fn(async (): Promise<Record<string, unknown>> => ({})),
  fetchDeletionDate: jest.fn(async (): Promise<string | null> => null),
  requestAccountDeletion: jest.fn(async (): Promise<string> => '2026-11-08T00:00:00Z'),
  cancelAccountDeletion: jest.fn(async (): Promise<void> => undefined),
  fetchConsents: jest.fn(async () => [] as { kind: string; version: string }[]),
  recordConsents: jest.fn(async (): Promise<void> => undefined),
});

const upsertObserver = (client: QueryClient) =>
  new MutationObserver<unknown, unknown, UpsertVars>(client, { mutationKey: ['upsert'] });
const deleteObserver = (client: QueryClient) =>
  new MutationObserver<unknown, unknown, SoftDeleteVars>(client, { mutationKey: ['softDelete'] });

const row = {
  id: 'tx-1',
  user_id: 'u1',
  account_id: 'a1',
  amount_laari: 12500,
  created_at: 'local',
  updated_at: 'local',
  deleted_at: null,
};
const vars: UpsertVars = { table: 'transactions', userId: 'u1', row };
const key = listKey('transactions', 'u1');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// TanStack keeps multi-day garbage-collection timers for queries and for mutations that are
// still pending (the paused-offline tests leave some on purpose). Unref them so they never
// hold the Jest process open; a hung `npm test` once ran for hours on CI.
const unref = <T>(id: T): T => {
  (id as unknown as { unref?: () => void }).unref?.();
  return id;
};
timeoutManager.setTimeoutProvider({
  setTimeout: (callback, delay) => unref(setTimeout(callback, delay)),
  clearTimeout: (id) => clearTimeout(id as number | undefined),
  setInterval: (callback, delay) => unref(setInterval(callback, delay)),
  clearInterval: (id) => clearInterval(id as number | undefined),
});

const clients: QueryClient[] = [];
const makeClient = (api: ReturnType<typeof fakeApi>) => {
  const client = createQueryClient(api);
  clients.push(client);
  return client;
};

afterEach(() => {
  onlineManager.setOnline(true);
  clients.splice(0).forEach((client) => client.clear());
});

describe('cache helpers', () => {
  it('upsertById appends new rows and replaces existing ones in place', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    expect(upsertById(list, { id: 'c' })).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(upsertById(list, { id: 'a', x: 1 } as { id: string })).toEqual([{ id: 'a', x: 1 }, { id: 'b' }]);
  });
  it('soft delete drops transactions but only marks accounts and categories', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    expect(applySoftDelete('transactions', list, 'a', 'T')).toEqual([{ id: 'b' }]);
    expect(applySoftDelete('accounts', list, 'a', 'T')).toEqual([{ id: 'a', deleted_at: 'T' }, { id: 'b' }]);
  });
});

describe('isTransient', () => {
  it('retries network failures but not database rule violations', () => {
    expect(isTransient(new TypeError('Network request failed'))).toBe(true);
    expect(isTransient({ message: 'TypeError: fetch failed', code: '' })).toBe(true);
    expect(isTransient({ code: '42501' })).toBe(false);
    expect(isTransient({ code: '23514' })).toBe(false);
  });
});

describe('offline mutation queue', () => {
  it('applies a write optimistically, holds it while offline, and sends it once on reconnect', async () => {
    const api = fakeApi();
    const client = makeClient(api);
    onlineManager.setOnline(false);

    upsertObserver(client).mutate(vars).catch(() => undefined);
    await tick();

    expect(api.upsert).not.toHaveBeenCalled();
    expect(client.getQueryData(key)).toEqual([row]); // visible immediately
    expect(client.isMutating()).toBe(1);

    onlineManager.setOnline(true);
    await client.resumePausedMutations();

    expect(api.upsert).toHaveBeenCalledTimes(1);
    // Server-owned columns are never sent.
    expect(api.upsert).toHaveBeenCalledWith('transactions', {
      id: 'tx-1',
      user_id: 'u1',
      account_id: 'a1',
      amount_laari: 12500,
    });
    await tick(); // resume resolves when the request finishes; settling happens a moment later
    expect(client.isMutating()).toBe(0);
  });

  it('survives an app restart: a paused write is saved, restored and replayed exactly once', async () => {
    const before = fakeApi();
    const clientBefore = makeClient(before);
    onlineManager.setOnline(false);
    upsertObserver(clientBefore).mutate(vars).catch(() => undefined);
    await tick();

    const saved = JSON.parse(JSON.stringify(dehydrate(clientBefore))); // what the persister writes to disk
    expect(saved.mutations).toHaveLength(1);
    expect(saved.mutations[0].scope).toEqual({ id: 'writes' }); // ordering survives a restart

    const after = fakeApi();
    const clientAfter = makeClient(after); // fresh process
    hydrate(clientAfter, saved);
    expect(clientAfter.getQueryData(key)).toEqual([row]); // optimistic row restored with the cache

    onlineManager.setOnline(true);
    await clientAfter.resumePausedMutations();
    expect(after.upsert).toHaveBeenCalledTimes(1);
    expect(after.upsert.mock.calls[0][1]).toMatchObject({ id: 'tx-1', amount_laari: 12500 });
    expect(before.upsert).not.toHaveBeenCalled();
  });

  it('replays queued writes in the order they were made', async () => {
    const api = fakeApi();
    const client = makeClient(api);
    onlineManager.setOnline(false);
    for (const id of ['one', 'two', 'three']) {
      upsertObserver(client)
        .mutate({ ...vars, row: { ...row, id } })
        .catch(() => undefined);
    }
    await tick();
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(api.upsert.mock.calls.map((call) => call[1].id)).toEqual(['one', 'two', 'three']);
  });

  it('sends queued writes one at a time, so a row never arrives before the row it depends on', async () => {
    const api = fakeApi();
    let releaseFirst: () => void = () => undefined;
    const started: string[] = [];
    api.upsert.mockImplementation(async (_table, row) => {
      started.push(String(row.id));
      if (row.id === 'account-1') await new Promise<void>((resolve) => (releaseFirst = resolve));
    });
    const client = makeClient(api);
    onlineManager.setOnline(false);
    // Created offline: an account, then a transaction that references it.
    upsertObserver(client).mutate({ table: 'accounts', userId: 'u1', row: { ...row, id: 'account-1' } }).catch(() => undefined);
    upsertObserver(client).mutate({ ...vars, row: { ...row, id: 'tx-on-account-1' } }).catch(() => undefined);
    await tick();

    onlineManager.setOnline(true);
    const resumed = client.resumePausedMutations();
    await tick();
    expect(started).toEqual(['account-1']); // the transaction must wait for the account to finish
    releaseFirst();
    await resumed;
    await tick();
    expect(started).toEqual(['account-1', 'tx-on-account-1']);
  });

  it('queues a delete offline and removes the transaction from the cache straight away', async () => {
    const api = fakeApi();
    const client = makeClient(api);
    client.setQueryData(key, [row]);
    onlineManager.setOnline(false);
    const del: SoftDeleteVars = { table: 'transactions', userId: 'u1', id: 'tx-1', at: 'now' };
    deleteObserver(client).mutate(del).catch(() => undefined);
    await tick();
    expect(client.getQueryData(key)).toEqual([]);
    expect(api.softDelete).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(api.softDelete).toHaveBeenCalledWith('transactions', 'tx-1', 'now');
  });

  it('Undo: a delete followed by a restore (at = null) clears deleted_at on the server, in order', async () => {
    const api = fakeApi();
    const client = makeClient(api);
    onlineManager.setOnline(false);
    deleteObserver(client).mutate({ table: 'transactions', userId: 'u1', id: 'tx-1', at: 'now' }).catch(() => undefined);
    deleteObserver(client).mutate({ table: 'transactions', userId: 'u1', id: 'tx-1', at: null }).catch(() => undefined);
    await tick();
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(api.softDelete.mock.calls.map((call) => call[2])).toEqual(['now', null]);
  });

  it('rolls back to server truth when the server rejects a write (no retry for rule violations)', async () => {
    const api = fakeApi();
    api.upsert.mockRejectedValue({ code: '42501', message: 'row-level security' });
    const client = makeClient(api);
    client.setQueryData(key, []);
    await expect(upsertObserver(client).mutate(vars)).rejects.toBeDefined();
    expect(api.upsert).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('queues encrypted debt fields and profile changes through the same ordered queue', async () => {
    const api = fakeApi();
    const client = makeClient(api);
    onlineManager.setOnline(false);
    const secrets = new MutationObserver<unknown, unknown, DebtSecretsVars>(client, { mutationKey: ['debtSecrets'] });
    const profile = new MutationObserver<unknown, unknown, ProfileVars>(client, { mutationKey: ['profileUpdate'] });
    secrets.mutate({ userId: 'u1', debtId: 'd1', secrets: { reference_no: 'REF-1', notes: 'n' } }).catch(() => undefined);
    profile.mutate({ userId: 'u1', patch: { privacy_mode: true } }).catch(() => undefined);
    await tick();
    expect(client.getQueryData(secretsKey('u1', 'd1'))).toEqual({ reference_no: 'REF-1', notes: 'n' });
    expect(client.getQueryData(profileKey('u1'))).toEqual({ privacy_mode: true });
    expect(api.setDebtSecrets).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    await tick();
    expect(api.setDebtSecrets).toHaveBeenCalledWith('d1', { reference_no: 'REF-1', notes: 'n' });
    expect(api.updateProfile).toHaveBeenCalledWith({ privacy_mode: true });
  });

  it('never sends the secret-id columns, which only the server may set', async () => {
    const api = fakeApi();
    const client = makeClient(api);
    await upsertObserver(client).mutate({
      table: 'debts',
      userId: 'u1',
      row: { id: 'd1', user_id: 'u1', lender: 'BML', reference_secret_id: 'x', notes_secret_id: 'y', created_at: 'c' },
    });
    expect(api.upsert).toHaveBeenCalledWith('debts', { id: 'd1', user_id: 'u1', lender: 'BML' });
  });

  it('keeps each user in a separate cache entry', () => {
    expect(listKey('transactions', 'u1')).not.toEqual(listKey('transactions', 'u2'));
  });
});
