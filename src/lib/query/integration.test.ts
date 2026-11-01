/**
 * Runs the real RowApi against a local Supabase (Postgres + RLS via PostgREST).
 * Run with `npm run test:integration` (plain Node config: the Expo preset replaces fetch).
 * Needs LOCAL_SUPABASE_URL and LOCAL_SUPABASE_KEY; CI sets them in the rls job.
 */
import { createClient } from '@supabase/supabase-js';
import { createRowApi } from './api';
import { isTransient } from './client';

const url = process.env.LOCAL_SUPABASE_URL;
const key = process.env.LOCAL_SUPABASE_KEY;

async function newUser() {
  const client = createClient(url as string, key as string, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signUp({
    email: `it-${crypto.randomUUID()}@example.test`,
    password: 'correct-horse-9',
  });
  if (error || !data.session || !data.user) throw error ?? new Error('sign-up returned no session');
  return { id: data.user.id, api: createRowApi(() => client) };
}

type User = Awaited<ReturnType<typeof newUser>>;

describe('RowApi against local Supabase', () => {
  beforeAll(() => {
    if (!url || !key) throw new Error('Set LOCAL_SUPABASE_URL and LOCAL_SUPABASE_KEY (see npm run test:integration)');
  });
  jest.setTimeout(30_000);
  let a: User;
  let b: User;
  let groceries: string;
  let salary: string;
  const accountId = crypto.randomUUID();
  const txId = crypto.randomUUID();

  const account = (user: User, id = accountId) => ({
    id, user_id: user.id, name: 'Cash', type: 'cash', opening_balance_laari: 100000,
  });
  const tx = (user: User, over: Record<string, unknown> = {}) => ({
    id: txId, user_id: user.id, account_id: accountId, category_id: groceries, amount_laari: 12550,
    kind: 'expense', occurred_on: '2026-11-01', note: 'shop', debt_id: null, commitment_id: null, ...over,
  });

  beforeAll(async () => {
    a = await newUser();
    b = await newUser();
    const categories = await a.api.fetchAll('categories');
    expect(categories).toHaveLength(12); // the built-in defaults, nothing else
    groceries = categories.find((c) => c.name_en === 'Groceries')?.id as string;
    salary = categories.find((c) => c.name_en === 'Salary')?.id as string;
  });

  it('creates rows; replaying the same write after a dropped connection is harmless; a later edit wins', async () => {
    await a.api.upsert('accounts', account(a));
    await a.api.upsert('transactions', tx(a));
    await a.api.upsert('transactions', tx(a)); // replay
    await a.api.upsert('transactions', tx(a, { amount_laari: 13000 })); // edit
    const rows = await a.api.fetchAll('transactions');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: txId, amount_laari: 13000, user_id: a.id });
  });

  it("user B sees none of A's rows, only the shared defaults", async () => {
    expect(await b.api.fetchAll('accounts')).toEqual([]);
    expect(await b.api.fetchAll('transactions')).toEqual([]);
    expect(await b.api.fetchAll('categories')).toHaveLength(12);
  });

  it("user B cannot take over A's rows by reusing their ids, and A's data is untouched", async () => {
    await expect(b.api.upsert('accounts', { ...account(b), name: 'stolen' })).rejects.toBeDefined();
    await expect(b.api.upsert('transactions', tx(b, { amount_laari: 1 }))).rejects.toBeDefined();
    const [mine] = await a.api.fetchAll('accounts');
    expect(mine).toMatchObject({ id: accountId, name: 'Cash' });
    expect((await a.api.fetchAll('transactions'))[0]).toMatchObject({ amount_laari: 13000 });
  });

  it('rejects writing a row as another user, with a rule error that is not retried', async () => {
    const error = await b.api.upsert('accounts', account(a, crypto.randomUUID())).catch((e) => e);
    expect(error).toMatchObject({ code: '42501' });
    expect(isTransient(error)).toBe(false);
  });

  it("rejects pointing a transaction at someone else's account", async () => {
    const error = await b.api
      .upsert('transactions', tx(b, { id: crypto.randomUUID() }))
      .catch((e) => e);
    expect(error).toBeDefined();
    expect(isTransient(error)).toBe(false);
  });

  it('rejects a transaction whose kind does not match its category', async () => {
    const error = await a.api
      .upsert('transactions', tx(a, { id: crypto.randomUUID(), kind: 'income', category_id: groceries }))
      .catch((e) => e);
    expect(error).toMatchObject({ code: '23514' });
    expect(isTransient(error)).toBe(false);
  });

  it('accepts income against an income category', async () => {
    await a.api.upsert('transactions', tx(a, { id: crypto.randomUUID(), kind: 'income', category_id: salary }));
    expect((await a.api.fetchAll('transactions')).filter((r) => r.kind === 'income')).toHaveLength(1);
  });

  it("B's soft delete of A's transaction changes nothing", async () => {
    await b.api.softDelete('transactions', txId, new Date().toISOString());
    expect((await a.api.fetchAll('transactions')).some((r) => r.id === txId)).toBe(true);
  });

  it('soft delete hides a transaction but archives (keeps) an account', async () => {
    const at = new Date().toISOString();
    await a.api.softDelete('transactions', txId, at);
    expect((await a.api.fetchAll('transactions')).some((r) => r.id === txId)).toBe(false);
    await a.api.softDelete('accounts', accountId, at);
    const accounts = await a.api.fetchAll('accounts');
    expect(accounts.find((r) => r.id === accountId)).toMatchObject({ deleted_at: expect.any(String) });
  });
});
