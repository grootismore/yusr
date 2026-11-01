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
    expect(categories).toHaveLength(13); // the built-in defaults, nothing else
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
    expect(await b.api.fetchAll('categories')).toHaveLength(13);
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

  describe('debts, giving and encrypted fields', () => {
    const debtId = crypto.randomUUID();
    const debt = (user: User, over: Record<string, unknown> = {}) => ({
      id: debtId, user_id: user.id, lender: 'BML', kind: 'bank', original_laari: 1000000, balance_laari: 800000,
      min_payment_laari: 50000, due_day: 15, is_interest_bearing: true, interest_rate_bps: 1250, ...over,
    });

    it('stores a debt and reads it back, with the balance in laari', async () => {
      await a.api.upsert('debts', debt(a));
      await a.api.upsert('debts', debt(a)); // replay
      const rows = await a.api.fetchAll('debts');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ lender: 'BML', balance_laari: 800000, interest_rate_bps: 1250 });
    });

    it('keeps the reference number and notes encrypted: set, read, replace and clear', async () => {
      await a.api.setDebtSecrets(debtId, { reference_no: 'ACC-123', notes: 'ask for Ali' });
      await a.api.setDebtSecrets(debtId, { reference_no: 'ACC-123', notes: 'ask for Ali' }); // replay is harmless
      expect(await a.api.getDebtSecrets(debtId)).toEqual({ reference_no: 'ACC-123', notes: 'ask for Ali' });
      await a.api.setDebtSecrets(debtId, { reference_no: 'ACC-999', notes: 'ask for Ali' });
      expect((await a.api.getDebtSecrets(debtId)).reference_no).toBe('ACC-999');
      await a.api.setDebtSecrets(debtId, { reference_no: '', notes: 'ask for Ali' });
      expect(await a.api.getDebtSecrets(debtId)).toEqual({ reference_no: '', notes: 'ask for Ali' });
    });

    it("user B can neither read nor overwrite A's encrypted fields, nor see the debt", async () => {
      expect(await b.api.fetchAll('debts')).toEqual([]);
      await expect(b.api.getDebtSecrets(debtId)).rejects.toMatchObject({ code: '42501' });
      await expect(b.api.setDebtSecrets(debtId, { reference_no: 'x', notes: 'y' })).rejects.toMatchObject({ code: '42501' });
      expect((await a.api.getDebtSecrets(debtId)).notes).toBe('ask for Ali');
    });

    it('refuses a client that tries to write the secret-id columns directly', async () => {
      const error = await a.api.upsert('debts', debt(a, { notes_secret_id: crypto.randomUUID() })).catch((e) => e);
      expect(error).toMatchObject({ code: '42501' });
      expect(isTransient(error)).toBe(false);
    });

    it('lets a payment reduce the derived balance, and rejects invalid links', async () => {
      const categories = await a.api.fetchAll('categories');
      const debtPayment = categories.find((c) => c.name_en === 'Debt payment')?.id as string;
      const payment = (over: Record<string, unknown> = {}) => ({
        id: crypto.randomUUID(), user_id: a.id, account_id: accountId, category_id: debtPayment, amount_laari: 50000,
        kind: 'expense', occurred_on: '2026-11-01', note: null, debt_id: debtId, commitment_id: null, ...over,
      });
      await a.api.upsert('accounts', account(a, accountId)); // archived earlier in this file; the row still exists, so the foreign key is satisfied
      await a.api.upsert('transactions', payment());
      const payments = (await a.api.fetchAll('transactions')).filter((t) => t.debt_id === debtId);
      expect(payments.reduce((sum, t) => sum + (t.amount_laari as number), 0)).toBe(50000);
      expect(await a.api.upsert('transactions', payment({ kind: 'income', category_id: salary })).catch((e) => e)).toMatchObject({ code: '23514' });
      expect(await b.api.upsert('transactions', payment({ user_id: b.id, id: crypto.randomUUID() })).catch((e) => e)).toBeDefined();
    });

    it('stores receivables, commitments and recurring items, and archives instead of deleting', async () => {
      const receivableId = crypto.randomUUID();
      await a.api.upsert('receivables', { id: receivableId, user_id: a.id, debtor: 'Hassan', amount_laari: 25000, due_on: null, notes: null });
      await a.api.softDelete('receivables', receivableId, new Date().toISOString());
      expect((await a.api.fetchAll('receivables'))[0]).toMatchObject({ debtor: 'Hassan', deleted_at: expect.any(String) });

      const commitmentId = crypto.randomUUID();
      await a.api.upsert('commitments', {
        id: commitmentId, user_id: a.id, type: 'sadaqah', amount_laari: 5000, schedule: 'weekly_friday', due_on: null,
        day_of_month: null, recipient_note: 'mosque', reminder_enabled: true, active: true,
      });
      expect(await a.api.fetchAll('commitments')).toHaveLength(1);
      expect(await b.api.fetchAll('commitments')).toEqual([]);
      const bad = await a.api
        .upsert('commitments', { id: crypto.randomUUID(), user_id: a.id, type: 'zakat', amount_laari: 1, schedule: 'monthly', day_of_month: null, active: true })
        .catch((e) => e);
      expect(bad).toMatchObject({ code: '23514' }); // monthly needs a day

      const rent = (await a.api.fetchAll('categories')).find((c) => c.name_en === 'Rent')?.id as string;
      await a.api.upsert('recurring_items', {
        id: crypto.randomUUID(), user_id: a.id, name: 'Rent', kind: 'expense', amount_laari: 700000, category_id: rent,
        account_id: accountId, schedule: 'monthly', day_of_month: 1, weekday: null, next_due_on: '2026-12-01', active: true,
      });
      expect(await a.api.fetchAll('recurring_items')).toHaveLength(1);
      expect(await b.api.fetchAll('recurring_items')).toEqual([]);
    });

    it('lets a user change their own privacy settings but not the server-owned release fields', async () => {
      await b.api.updateProfile({ privacy_mode: true, hijri_adjustment: -1 });
      expect(await b.api.fetchProfile()).toMatchObject({ privacy_mode: true, hijri_adjustment: -1 });
      expect(await a.api.fetchProfile()).toMatchObject({ privacy_mode: false, hijri_adjustment: 0 }); // A is unaffected
      const error = await b.api.updateProfile({ last_active_at: new Date().toISOString() }).catch((e) => e);
      expect(error).toMatchObject({ code: '42501' });
      expect(await b.api.updateProfile({ hijri_adjustment: 5 }).catch((e) => e)).toMatchObject({ code: '23514' });
    });
  });
});
