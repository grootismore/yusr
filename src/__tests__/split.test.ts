import { balances, computeShares, meOf, ofGroup, simplify, type SplitData, type SplitPerson } from '@/features/split/logic';

const sum = (r: Record<string, number>) => Object.values(r).reduce((s, v) => s + v, 0);

describe('splitting a cost', () => {
  it('equal: always adds up, leftover units go to the first people', () => {
    const r = computeShares(100_001, 'equal', { a: 0, b: 0, c: 0 });
    expect(r.ok && r.shares).toEqual({ a: 33_334, b: 33_334, c: 33_333 });
    expect(computeShares(100, 'equal', { a: 0, b: 0, c: 0, d: 0 })).toEqual({ ok: true, shares: { a: 25, b: 25, c: 25, d: 25 } });
  });
  it('exact: must add up to the total', () => {
    expect(computeShares(1000, 'exact', { a: 700, b: 300 })).toEqual({ ok: true, shares: { a: 700, b: 300 } });
    expect(computeShares(1000, 'exact', { a: 700, b: 200 })).toEqual({ ok: false, error: 'sum' });
  });
  it('percent: in hundredths, must be 100%, and still adds up exactly', () => {
    const r = computeShares(100_000, 'percent', { a: 3333, b: 3333, c: 3334 });
    expect(r.ok && sum(r.shares)).toBe(100_000);
    expect(computeShares(1000, 'percent', { a: 5000, b: 4000 })).toEqual({ ok: false, error: 'sum' });
  });
  it('shares: weights, so 2 pays twice 1', () => {
    expect(computeShares(900, 'shares', { a: 1, b: 2 })).toEqual({ ok: true, shares: { a: 300, b: 600 } });
    const odd = computeShares(1000, 'shares', { a: 1, b: 1, c: 1 });
    expect(odd.ok && sum(odd.shares)).toBe(1000);
  });
  it('refuses nobody and zero weights', () => {
    expect(computeShares(100, 'equal', {})).toEqual({ ok: false, error: 'nobody' });
    expect(computeShares(100, 'shares', { a: 0, b: 0 })).toEqual({ ok: false, error: 'zero' });
  });
});

describe('who owes whom', () => {
  const people: SplitPerson[] = [{ id: 'me', group_id: 'g', name: 'Me', is_me: true }, { id: 'a', group_id: 'g', name: 'Ahmed', is_me: false }, { id: 'b', group_id: 'g', name: 'Aisha', is_me: false }];
  const data: SplitData = {
    groups: [{ id: 'g', name: 'Trip', currency: 'MVR', archived: false }], people,
    expenses: [
      { id: 'e1', group_id: 'g', description: 'Dinner', amount_minor: 90_000, paid_by: 'me', split_type: 'equal', spent_on: '2026-11-10', note: null },
      { id: 'e2', group_id: 'g', description: 'Boat', amount_minor: 30_000, paid_by: 'a', split_type: 'equal', spent_on: '2026-11-11', note: null },
    ],
    shares: [
      { expense_id: 'e1', person_id: 'me', share_minor: 30_000 }, { expense_id: 'e1', person_id: 'a', share_minor: 30_000 }, { expense_id: 'e1', person_id: 'b', share_minor: 30_000 },
      { expense_id: 'e2', person_id: 'me', share_minor: 10_000 }, { expense_id: 'e2', person_id: 'a', share_minor: 10_000 }, { expense_id: 'e2', person_id: 'b', share_minor: 10_000 },
    ],
    settlements: [],
  };
  it('balances add up to zero: what you paid minus your shares', () => {
    const g = ofGroup(data, 'g');
    expect(g.net).toEqual({ me: 50_000, a: -10_000, b: -40_000 });
    expect(sum(g.net)).toBe(0);
  });
  it('simplify gives the fewest payments', () => {
    expect(simplify({ me: 50_000, a: -10_000, b: -40_000 })).toEqual([{ from: 'b', to: 'me', amount: 40_000 }, { from: 'a', to: 'me', amount: 10_000 }]);
    expect(simplify({ x: 0, y: 0 })).toEqual([]);
  });
  it('a settlement moves the balance: Aisha pays me back 40,000 and she is square', () => {
    const settled = balances(people, data.expenses, data.shares, [{ id: 's', group_id: 'g', from_person: 'b', to_person: 'me', amount_minor: 40_000, settled_on: '2026-11-12', note: null }]);
    expect(settled).toEqual({ me: 10_000, a: -10_000, b: 0 });
  });
  it('a share of a deleted expense no longer counts', () => {
    const fewer = balances(people, [data.expenses[1]], data.shares, []);
    expect(fewer).toEqual({ me: -10_000, a: 20_000, b: -10_000 });
  });
});

describe('meOf with linked accounts', () => {
  const people = [
    { id: 'a', group_id: 'g', name: 'Aisha', is_me: true, account_id: 'u-owner' },
    { id: 'b', group_id: 'g', name: 'Ahmed', is_me: false, account_id: 'u-friend' },
    { id: 'c', group_id: 'g', name: 'Shifa', is_me: false, account_id: null },
  ];
  it('is the name linked to my account, for the owner and for a friend', () => {
    expect(meOf(people, 'u-owner')?.id).toBe('a');
    expect(meOf(people, 'u-friend')?.id).toBe('b');
  });
  it("is not the owner's row for a friend who is not linked", () => {
    expect(meOf(people, 'u-stranger')).toBeUndefined();
  });
  it('falls back to the unlinked name marked as mine (a group not yet sent)', () => {
    expect(meOf([{ id: 'x', group_id: 'g', name: 'Me', is_me: true }], 'u1')?.id).toBe('x');
  });
});
