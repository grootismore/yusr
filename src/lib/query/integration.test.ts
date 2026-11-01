/**
 * Runs the real RowApi against a local Supabase (Postgres + RLS via PostgREST).
 * Run with `npm run test:integration` (plain Node config: the Expo preset replaces fetch).
 * Needs LOCAL_SUPABASE_URL and LOCAL_SUPABASE_KEY; CI sets them in the rls job.
 */
import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createRowApi } from './api';
import { isTransient } from './client';

const url = process.env.LOCAL_SUPABASE_URL;
const key = process.env.LOCAL_SUPABASE_KEY;

const functionsUrl = process.env.LOCAL_FUNCTIONS_URL; // e.g. http://127.0.0.1:54321/functions/v1
const itFunction = functionsUrl ? it : it.skip;

async function newUser(email = `it-${crypto.randomUUID()}@example.test`) {
  const client = createClient(url as string, key as string, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signUp({
    email,
    password: 'correct-horse-9',
  });
  if (error || !data.session || !data.user) throw error ?? new Error('sign-up returned no session');
  return { id: data.user.id, client, email, api: createRowApi(() => client) };
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

  describe('Wasiyyah register, trusted contacts and the invite endpoint', () => {
    const newToken = () => randomBytes(32).toString('base64url');
    const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');
    const invite = (user: User, over: Record<string, unknown> = {}) => {
      const token = newToken();
      return {
        token,
        row: {
          id: crypto.randomUUID(), user_id: user.id, name: 'Cee', inviter_name: 'Aisha',
          email: `contact-${crypto.randomUUID()}@example.test`, phone: null, invite_token_hash: hashOf(token),
          invite_expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), consented_at: new Date().toISOString(), ...over,
        },
      };
    };
    const call = async (body: unknown, ip: string, method = 'POST') =>
      fetch(`${functionsUrl}/accept-invite`, {
        method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      });
    const randomIp = () => `198.51.100.${Math.floor(Math.random() * 250)}-${crypto.randomUUID()}`;

    it('keeps the instruction note encrypted: write, read, replace, clear, and nobody else sees it', async () => {
      expect(await a.api.hasWasiyyahNote()).toBe(false);
      await a.api.setWasiyyahNote('Call my brother Ali first.');
      expect(await a.api.hasWasiyyahNote()).toBe(true);
      expect(await a.api.getWasiyyahNote()).toBe('Call my brother Ali first.');
      expect(await b.api.getWasiyyahNote()).toBe(''); // B has no note and cannot see A's
      expect(await b.api.hasWasiyyahNote()).toBe(false);
      await a.api.setWasiyyahNote('');
      expect(await a.api.hasWasiyyahNote()).toBe(false);
      await a.api.setWasiyyahNote('Final note.');
    });

    it('records note changes and register shares in an audit log nobody else can read or write', async () => {
      await a.api.logRegisterShared(['debts', 'note']);
      const log = await a.api.fetchAuditLog();
      expect(log.map((e) => e.event)).toEqual(expect.arrayContaining(['note_changed', 'register_shared']));
      expect(log.every((e) => e.actor === 'user')).toBe(true);
      expect(JSON.stringify(log)).not.toContain('Final note');
      expect(await b.api.fetchAuditLog()).toEqual([]);
      await expect(a.api.logRegisterShared(['passwords'])).rejects.toMatchObject({ code: '22023' });
      const forged = await a.client.from('audit_log').insert({ user_id: a.id, actor: 'user', event: 'note_changed' });
      expect(forged.error?.code).toBe('42501');
      const wiped = await a.client.from('audit_log').delete().eq('user_id', a.id);
      expect(wiped.error?.code).toBe('42501');
    });

    it('invites up to three contacts, needs consent, and lets the owner revoke but not edit', async () => {
      const first = invite(a);
      await a.api.createContact(first.row);
      const [created] = (await a.api.fetchContacts()).filter((c) => c.id === first.row.id);
      expect(created).toMatchObject({ status: 'invited', name: 'Cee' });
      expect(await b.api.fetchContacts()).toEqual([]);
      await a.api.createContact(invite(a).row);
      await a.api.createContact(invite(a).row);
      await expect(a.api.createContact(invite(a).row)).rejects.toMatchObject({ code: '23514' }); // a fourth
      await expect(b.api.createContact(invite(a, { user_id: a.id }).row)).rejects.toMatchObject({ code: '42501' });
      await expect(a.api.createContact(invite(a, { consented_at: null }).row)).rejects.toMatchObject({ code: '23514' });
      const rename = await a.client.from('trusted_contacts').update({ name: 'Renamed' }).eq('id', first.row.id);
      expect(rename.error?.code).toBe('42501');
      const accept = await a.client.from('trusted_contacts').update({ status: 'accepted' }).eq('id', first.row.id);
      expect(accept.error?.code).toBe('42501');
      await a.api.revokeContact(first.row.id as string);
      expect((await a.api.fetchContacts()).find((c) => c.id === first.row.id)).toMatchObject({ status: 'revoked' });
      await a.api.createContact(invite(a).row); // a revoked contact frees a slot
    });

    itFunction('accepts an invite through the real function, once, and logs it as the contact acting', async () => {
      const user = await newUser();
      const { token, row } = invite(user);
      await user.api.createContact(row);
      const ip = randomIp();

      const checked = await (await call({ token, action: 'check' }, ip)).json();
      expect(checked).toEqual({ ok: true, inviter_name: 'Aisha' });
      expect((await user.api.fetchContacts())[0]).toMatchObject({ status: 'invited' });

      const accepted = await call({ token, action: 'accept' }, ip);
      expect(accepted.status).toBe(200);
      expect(await accepted.json()).toEqual({ ok: true, state: 'accepted' });
      const [contact] = await user.api.fetchContacts();
      expect(contact).toMatchObject({ status: 'accepted', invite_token_hash: null });
      expect(contact.accepted_at).toBeTruthy();

      // Accepting spends the token by erasing its hash, so a second visit finds nothing: a used link
      // is indistinguishable from one that never existed.
      const again = await call({ token, action: 'accept' }, ip);
      expect(again.status).toBe(404);
      expect((await again.json()).error).toBe('invalid');

      const log = await user.api.fetchAuditLog();
      expect(log.find((e) => e.event === 'contact_accepted')).toMatchObject({ actor: 'contact' });
      expect(log.filter((e) => e.event === 'contact_invited')).toHaveLength(1);
    });

    itFunction('lets a contact decline, and an owner who revoked first makes the link useless', async () => {
      const user = await newUser();
      const declined = invite(user);
      await user.api.createContact(declined.row);
      expect((await call({ token: declined.token, action: 'decline' }, randomIp())).status).toBe(200);
      expect((await user.api.fetchContacts())[0]).toMatchObject({ status: 'revoked' });
      expect((await user.api.fetchAuditLog()).some((e) => e.event === 'contact_declined' && e.actor === 'contact')).toBe(true);

      const revoked = invite(user);
      await user.api.createContact(revoked.row);
      await user.api.revokeContact(revoked.row.id as string);
      const res = await call({ token: revoked.token, action: 'accept' }, randomIp());
      expect(res.status).toBe(404); // revoking also spends the token
      expect((await user.api.fetchContacts()).find((c) => c.id === revoked.row.id)).toMatchObject({ status: 'revoked' });
    });

    itFunction('refuses unknown tokens, malformed requests and the wrong method, and answers CORS preflight', async () => {
      const ip = randomIp();
      expect((await call({ token: newToken(), action: 'accept' }, ip)).status).toBe(404);
      expect((await call({ token: 'short', action: 'accept' }, ip)).status).toBe(400);
      expect((await call({ token: newToken(), action: 'wipe' }, ip)).status).toBe(400);
      expect((await call(null, ip, 'GET')).status).toBe(405);
      const preflight = await call(null, ip, 'OPTIONS');
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('access-control-allow-methods')).toContain('POST');
    });

    itFunction('throttles one address after 20 attempts in an hour, without affecting others', async () => {
      const ip = randomIp();
      const statuses: number[] = [];
      for (let i = 0; i < 22; i++) statuses.push((await call({ token: newToken(), action: 'check' }, ip)).status);
      expect(statuses.slice(0, 20).every((s) => s === 404)).toBe(true);
      expect(statuses.slice(20)).toEqual([429, 429]);
      expect((await call({ token: newToken(), action: 'check' }, randomIp())).status).toBe(404); // someone else is fine
    });

    it('keeps the register closed to an accepted contact until the case is released', async () => {
      const contact = await newUser();
      const { row } = invite(a, { email: contact.email });
      await a.api.revokeContact((await a.api.fetchContacts()).find((c) => c.status === 'invited')?.id as string);
      await a.api.createContact(row);
      // (accepting needs the server; the database tests cover the accepted + released path in full)
      const result = await contact.client.rpc('get_register_for_contact', { p_owner: a.id });
      expect(result.error?.code).toBe('42501');
      const anon = createClient(url as string, key as string, { auth: { persistSession: false } });
      expect((await anon.rpc('get_register_for_contact', { p_owner: a.id })).error?.code).toBe('42501');
      expect((await contact.client.from('debts').select('*')).data).toEqual([]); // and the tables stay closed
    });
  });
});
