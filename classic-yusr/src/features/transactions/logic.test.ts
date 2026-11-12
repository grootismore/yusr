import {
  accountBalance,
  categoryBreakdown,
  filterTransactions,
  fromISODate,
  groupByDay,
  monthOf,
  monthSummary,
  shiftMonth,
  signedAmount,
  toISODate,
} from './logic';
import type { Account, Transaction } from './types';

let n = 0;
function tx(over: Partial<Transaction>): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    user_id: 'u',
    account_id: 'a1',
    category_id: 'c1',
    amount_laari: 100,
    kind: 'expense',
    occurred_on: '2026-11-01',
    note: null,
    debt_id: null,
    commitment_id: null,
    created_at: `2026-11-01T00:00:${String(n).padStart(2, '0')}Z`,
    updated_at: '',
    deleted_at: null,
    ...over,
  };
}
const account = (over: Partial<Account> = {}): Account => ({
  id: 'a1',
  user_id: 'u',
  name: 'Cash',
  type: 'cash',
  opening_balance_laari: 10000,
  created_at: '',
  updated_at: '',
  deleted_at: null,
  ...over,
});

describe('balances', () => {
  it('signs income positive and expense/giving negative', () => {
    expect(signedAmount({ kind: 'income', amount_laari: 500 })).toBe(500);
    expect(signedAmount({ kind: 'expense', amount_laari: 500 })).toBe(-500);
    expect(signedAmount({ kind: 'giving', amount_laari: 500 })).toBe(-500);
  });

  it('derives balance from opening balance + live transactions of that account only', () => {
    const list = [
      tx({ kind: 'income', amount_laari: 50000 }),
      tx({ kind: 'expense', amount_laari: 12550 }),
      tx({ kind: 'giving', amount_laari: 2500 }),
      tx({ kind: 'expense', amount_laari: 99999, deleted_at: '2026-11-02T00:00:00Z' }), // deleted: ignored
      tx({ kind: 'expense', amount_laari: 7777, account_id: 'other' }), // other account: ignored
    ];
    expect(accountBalance(account(), list)).toBe(10000 + 50000 - 12550 - 2500);
  });

  it('can go negative and stays an exact integer', () => {
    expect(accountBalance(account({ opening_balance_laari: 0 }), [tx({ amount_laari: 1 })])).toBe(-1);
    const tenths = [tx({ kind: 'income', amount_laari: 10 }), tx({ kind: 'income', amount_laari: 20 })];
    expect(accountBalance(account({ opening_balance_laari: 0 }), tenths)).toBe(30);
  });
});

describe('groupByDay', () => {
  it('orders days newest first, entries newest first, and totals the net per day', () => {
    const a = tx({ occurred_on: '2026-11-01', kind: 'income', amount_laari: 1000 });
    const b = tx({ occurred_on: '2026-11-03', amount_laari: 300 });
    const c = tx({ occurred_on: '2026-11-03', amount_laari: 200 });
    const gone = tx({ occurred_on: '2026-11-05', deleted_at: 'x' });
    const sections = groupByDay([a, b, c, gone]);
    expect(sections.map((s) => s.date)).toEqual(['2026-11-03', '2026-11-01']);
    expect(sections[0].data.map((t) => t.id)).toEqual([c.id, b.id]);
    expect(sections[0].net).toBe(-500);
    expect(sections[1].net).toBe(1000);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('monthSummary', () => {
  const list = [
    tx({ occurred_on: '2026-11-02', kind: 'income', amount_laari: 1_000_000 }),
    tx({ occurred_on: '2026-11-10', kind: 'expense', amount_laari: 250_050 }),
    tx({ occurred_on: '2026-11-11', kind: 'giving', amount_laari: 25_000 }),
    tx({ occurred_on: '2026-10-31', kind: 'expense', amount_laari: 999_999 }), // other month
    tx({ occurred_on: '2026-11-12', kind: 'expense', amount_laari: 5, deleted_at: 'x' }),
  ];
  it('keeps giving separate and nets everything out', () => {
    expect(monthSummary(list, '2026-11')).toEqual({
      income: 1_000_000,
      expense: 250_050,
      giving: 25_000,
      net: 724_950,
    });
  });
  it('is all zeros for an empty month', () => {
    expect(monthSummary(list, '2027-01')).toEqual({ income: 0, expense: 0, giving: 0, net: 0 });
  });
});

describe('categoryBreakdown', () => {
  it('ranks outgoing categories and ignores income', () => {
    const list = [
      tx({ category_id: 'rent', amount_laari: 7500 }),
      tx({ category_id: 'food', amount_laari: 2000 }),
      tx({ category_id: 'food', amount_laari: 500 }),
      tx({ category_id: 'zakat', kind: 'giving', amount_laari: 0 + 1 }),
      tx({ category_id: 'salary', kind: 'income', amount_laari: 999_999 }),
    ];
    const result = categoryBreakdown(list, '2026-11');
    expect(result.map((r) => r.categoryId)).toEqual(['rent', 'food', 'zakat']);
    expect(result[0]).toEqual({ categoryId: 'rent', total: 7500, percent: 75 });
    expect(result[1].total).toBe(2500);
  });
  it('is empty when nothing was spent', () => {
    expect(categoryBreakdown([tx({ kind: 'income' })], '2026-11')).toEqual([]);
  });
});

describe('dates', () => {
  it('formats local dates, not UTC', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toISODate(fromISODate('2026-02-28'))).toBe('2026-02-28');
  });
  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
    expect(monthOf('2026-11-30')).toBe('2026-11');
  });
});

describe('filterTransactions (search)', () => {
  const rows = [
    tx({ id: 'g', amount_laari: 4500, note: 'Weekly shop', category_id: 'groceries' }),
    tx({ id: 'f', amount_laari: 45000, note: 'Ferry ticket', category_id: 'transport' }),
    tx({ id: 'z', amount_laari: 90000, kind: 'giving', note: 'Hassan family', category_id: 'zakat' }),
  ];
  const names: Record<string, string> = { groceries: 'Groceries', transport: 'Transport', zakat: 'Zakat' };
  const lookups = (hide = false) => ({
    categoryName: (t: Transaction) => names[t.category_id],
    accountName: () => 'Cash',
    hidden: (t: Transaction) => hide && t.kind === 'giving',
  });
  const ids = (q: string, hide = false) => filterTransactions(rows, q, lookups(hide)).map((t) => t.id);

  it('returns everything for an empty or blank query', () => {
    expect(ids('')).toEqual(['g', 'f', 'z']);
    expect(ids('   ')).toEqual(['g', 'f', 'z']);
  });
  it('matches category, account and note without regard to case', () => {
    expect(ids('GROC')).toEqual(['g']);
    expect(ids('cash')).toEqual(['g', 'f', 'z']);
    expect(ids('ferry')).toEqual(['f']);
  });
  it('matches the amount as shown: 45 finds 45.00 and 450.00', () => {
    expect(ids('45')).toEqual(['g', 'f']);
    expect(ids('450.00')).toEqual(['f']);
    expect(ids('900')).toEqual(['z']);
  });
  it('finds nothing for an unknown term', () => {
    expect(ids('submarine')).toEqual([]);
  });
  it('does not let search reveal what private mode hides', () => {
    expect(ids('hassan', true)).toEqual([]); // the note is hidden
    expect(ids('900', true)).toEqual([]); // the amount is hidden
    expect(ids('zakat', true)).toEqual(['z']); // the category name is shown
    expect(ids('hassan', false)).toEqual(['z']);
  });
  it('does not change the input', () => {
    const before = [...rows];
    filterTransactions(rows, 'ferry', lookups());
    expect(rows).toEqual(before);
  });
});
