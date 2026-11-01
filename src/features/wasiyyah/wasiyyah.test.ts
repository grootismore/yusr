import type { Debt, Receivable } from '@/features/debts/types';
import type { Commitment } from '@/features/giving/types';
import type { Transaction } from '@/features/transactions/types';
import { TOKEN_PATTERN } from '../../../supabase/functions/_shared/invite';
import { buildInviteLink, generateInviteToken, hashInviteToken, inviteExpiry, isPlausibleEmail } from './invite';
import { buildRegister, readiness, registerToText, type Register, type Section, type ShareLabels } from './register';

// Stand in for the native module with Node's own crypto (loaded lazily, as jest.mock requires).
jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual('node:crypto');
  return {
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, text: string) => nodeCrypto.createHash('sha256').update(text).digest('hex'),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  };
});


describe('invite tokens', () => {
  it('are 43-character base64url strings that the server accepts', () => {
    for (let i = 0; i < 200; i++) expect(TOKEN_PATTERN.test(generateInviteToken())).toBe(true);
  });
  it('are unique and unguessable-looking', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateInviteToken));
    expect(tokens.size).toBe(500);
  });
  it('hash to the SHA-256 hex the database stores', async () => {
    expect(await hashInviteToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await hashInviteToken(generateInviteToken())).toMatch(/^[0-9a-f]{64}$/);
  });
  it('put the token after "#" so it never reaches the accept page\'s server logs', () => {
    expect(buildInviteLink('https://yusr.example/accept', 'TOKEN')).toBe('https://yusr.example/accept/#TOKEN');
    expect(buildInviteLink('https://yusr.example/accept/', 'TOKEN')).toBe('https://yusr.example/accept/#TOKEN');
    expect(buildInviteLink('https://yusr.example/accept#old', 'TOKEN')).toBe('https://yusr.example/accept/#TOKEN');
  });
  it('expire seven days out', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    expect(inviteExpiry(now)).toBe('2026-11-08T00:00:00.000Z');
  });
  it('validates emails loosely but safely', () => {
    expect(isPlausibleEmail(' a@b.mv ')).toBe(true);
    for (const bad of ['', 'a', 'a@b', '@b.c', 'a b@c.d', `${'a'.repeat(250)}@b.cd`]) expect(isPlausibleEmail(bad)).toBe(false);
  });
});

const stamp = { created_at: '', updated_at: '', deleted_at: null };
const debt = (over: Partial<Debt> = {}): Debt => ({
  id: 'd1', user_id: 'u', lender: 'BML', kind: 'bank', original_laari: 500000, balance_laari: 100000, min_payment_laari: 10000, due_day: 5,
  is_interest_bearing: false, interest_rate_bps: null, reference_secret_id: null, notes_secret_id: null, ...stamp, ...over,
});
const pay = (debtId: string, amount: number): Transaction => ({
  id: `p-${debtId}-${amount}`, user_id: 'u', account_id: 'a', category_id: 'c', amount_laari: amount, kind: 'expense', occurred_on: '2026-11-01',
  note: null, debt_id: debtId, commitment_id: null, ...stamp,
});
const gift = (over: Partial<Commitment> = {}): Commitment => ({
  id: 'g1', user_id: 'u', type: 'zakat', amount_laari: 90000, schedule: 'ramadan', due_on: null, day_of_month: null,
  recipient_note: 'Aminath, Hulhumalé', reminder_enabled: true, active: true, ...stamp, ...over,
});
const owed = (over: Partial<Receivable> = {}): Receivable => ({ id: 'r1', user_id: 'u', debtor: 'Hassan', amount_laari: 25000, due_on: null, notes: null, ...stamp, ...over });

const labels: ShareLabels = {
  title: 'Wasiyyah', debts: 'Debts', receivables: 'Owed to me', giving: 'Giving', note: 'Note', reference: 'Ref', contactFirst: 'Contact first',
  type: (t) => `type:${t}`, schedule: (s) => `sched:${s}`, footer: 'Shared from Yusr',
};

describe('buildRegister', () => {
  const secrets = new Map([['d1', { reference_no: 'ACC-777', notes: 'call Ali first' }]]);
  const register = (over = {}) =>
    buildRegister({
      debts: [debt(), debt({ id: 'd2', lender: 'Cleared', balance_laari: 5000 }), debt({ id: 'd3', lender: 'Archived', deleted_at: 'x' })],
      transactions: [pay('d1', 30000), pay('d2', 5000)],
      receivables: [owed(), owed({ id: 'r2', debtor: 'Gone', deleted_at: 'x' })],
      commitments: [gift(), gift({ id: 'g2', active: false, type: 'sadaqah' })],
      secrets,
      note: 'Please call my brother.',
      ...over,
    });

  it('lists only what is still owed, with the derived balance and the decrypted details', () => {
    const r = register();
    expect(r.debts).toEqual([{ lender: 'BML', balance: 70000, referenceNo: 'ACC-777', notes: 'call Ali first' }]);
  });
  it('leaves out settled, archived and inactive items', () => {
    const r = register();
    expect(r.receivables).toEqual([{ debtor: 'Hassan', amount: 25000 }]);
    expect(r.giving).toEqual([{ type: 'zakat', amount: 90000, schedule: 'ramadan' }]);
  });
  it('never includes the private recipient note', () => {
    expect(JSON.stringify(register())).not.toContain('Aminath');
  });
  it('copes with secrets that have not loaded', () => {
    expect(register({ secrets: new Map() }).debts[0]).toMatchObject({ referenceNo: '', notes: '' });
  });
});

describe('registerToText', () => {
  const r: Register = buildRegister({
    debts: [debt()], transactions: [pay('d1', 30000)], receivables: [owed()], commitments: [gift()],
    secrets: new Map([['d1', { reference_no: 'ACC-777', notes: 'call Ali first' }]]), note: 'Please call my brother.',
  });
  const text = (...sections: Section[]) => registerToText(r, new Set(sections), labels);

  it('writes the chosen sections in plain text', () => {
    const t = text('debts', 'receivables', 'giving', 'note');
    expect(t).toContain('- BML: MVR 700.00');
    expect(t).toContain('Ref: ACC-777');
    expect(t).toContain('Contact first: call Ali first');
    expect(t).toContain('- Hassan: MVR 250.00');
    expect(t).toContain('- type:zakat (sched:ramadan): MVR 900.00');
    expect(t).toContain('Please call my brother.');
    expect(t.endsWith('Shared from Yusr')).toBe(true);
  });
  it.each([
    [['debts'], ['BML', 'ACC-777', 'call Ali first'], ['Hassan', 'zakat', 'Please call']],
    [['receivables'], ['Hassan'], ['BML', 'ACC-777', 'zakat', 'Please call']],
    [['giving'], ['zakat'], ['BML', 'ACC-777', 'Hassan', 'Please call']],
    [['note'], ['Please call my brother.'], ['BML', 'ACC-777', 'Hassan', 'zakat']],
  ] as [Section[], string[], string[]][])('shares only %j, nothing from the sections left unticked', (sections, present, absent) => {
    const t = text(...sections);
    for (const s of present) expect(t).toContain(s);
    for (const s of absent) expect(t).not.toContain(s);
  });
  it('shares nothing but the header and footer when nothing is chosen', () => {
    expect(text()).toBe('Wasiyyah\n\nShared from Yusr');
  });
  it('never includes the private recipient note, whatever is chosen', () => {
    expect(text('debts', 'receivables', 'giving', 'note')).not.toContain('Aminath');
  });
});

describe('readiness', () => {
  it('counts the three steps of the checklist', () => {
    expect(readiness({ debtCount: 0, contactCount: 0, hasNote: false })).toMatchObject({ done: 0, debtsAdded: false });
    expect(readiness({ debtCount: 2, contactCount: 0, hasNote: true })).toMatchObject({ done: 2, contactInvited: false });
    expect(readiness({ debtCount: 1, contactCount: 1, hasNote: true })).toMatchObject({ done: 3 });
  });
});
