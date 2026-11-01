import { MutationObserver, dehydrate, hydrate, onlineManager, type QueryClient } from '@tanstack/react-query';
import { applySoftDelete, upsertById, type Table } from './cache';
import { createQueryClient, isTransient, listKey, type SoftDeleteVars, type UpsertVars } from './client';

const fakeApi = () => ({
  fetchAll: jest.fn(async (_table: Table): Promise<Record<string, unknown>[]> => []),
  upsert: jest.fn(async (_table: Table, _row: Record<string, unknown>): Promise<void> => undefined),
  softDelete: jest.fn(async (_table: Table, _id: string, _at: string): Promise<void> => undefined),
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

afterEach(() => onlineManager.setOnline(true));

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
    const client = createQueryClient(api);
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
    const clientBefore = createQueryClient(before);
    onlineManager.setOnline(false);
    upsertObserver(clientBefore).mutate(vars).catch(() => undefined);
    await tick();

    const saved = JSON.parse(JSON.stringify(dehydrate(clientBefore))); // what the persister writes to disk
    expect(saved.mutations).toHaveLength(1);

    const after = fakeApi();
    const clientAfter = createQueryClient(after); // fresh process
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
    const client = createQueryClient(api);
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

  it('queues a delete offline and removes the transaction from the cache straight away', async () => {
    const api = fakeApi();
    const client = createQueryClient(api);
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

  it('rolls back to server truth when the server rejects a write (no retry for rule violations)', async () => {
    const api = fakeApi();
    api.upsert.mockRejectedValue({ code: '42501', message: 'row-level security' });
    const client = createQueryClient(api);
    client.setQueryData(key, []);
    await expect(upsertObserver(client).mutate(vars)).rejects.toBeDefined();
    expect(api.upsert).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('keeps each user in a separate cache entry', () => {
    expect(listKey('transactions', 'u1')).not.toEqual(listKey('transactions', 'u2'));
  });
});
