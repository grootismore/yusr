import { daySheet } from '@/features/split/sheet';
import type { SplitData } from '@/features/split/logic';

const data: SplitData = {
  groups: [{ id: 'g', name: 'Beach trip', currency: 'MVR', archived: false }],
  people: [{ id: 'a', group_id: 'g', name: 'Aisha', is_me: true }, { id: 'b', group_id: 'g', name: 'Ahmed', is_me: false }, { id: 'c', group_id: 'g', name: 'Shifa', is_me: false }],
  expenses: [
    { id: 'e1', group_id: 'g', description: 'Boat', amount_minor: 90_000, paid_by: 'a', split_type: 'equal', spent_on: '2026-11-10', note: null },
    { id: 'e2', group_id: 'g', description: 'Dinner', amount_minor: 60_000, paid_by: 'b', split_type: 'equal', spent_on: '2026-11-11', note: null },
  ],
  shares: [
    { expense_id: 'e1', person_id: 'a', share_minor: 30_000 }, { expense_id: 'e1', person_id: 'b', share_minor: 30_000 }, { expense_id: 'e1', person_id: 'c', share_minor: 30_000 },
    { expense_id: 'e2', person_id: 'a', share_minor: 30_000 }, { expense_id: 'e2', person_id: 'b', share_minor: 30_000 },
  ],
  settlements: [{ id: 's1', group_id: 'g', from_person: 'c', to_person: 'a', amount_minor: 30_000, settled_on: '2026-11-11', note: null }],
};

describe('daySheet', () => {
  it("lists the day's costs with who paid and who shared", () => {
    const s = daySheet(data, 'g', '2026-11-11')!;
    expect(s.lines).toEqual([{ id: 'e2', description: 'Dinner', amount: 60_000, paidBy: 'Ahmed', among: ['Aisha', 'Ahmed'] }]);
    expect(s.total).toBe(60_000);
    expect(s.paid).toEqual([{ name: 'Ahmed', amount: 60_000 }]);
    expect(s.settled).toEqual([{ from: 'Shifa', to: 'Aisha', amount: 30_000 }]);
  });
  it('counts everything up to the end of the day for who owes whom', () => {
    const s = daySheet(data, 'g', '2026-11-11')!;
    // Aisha paid 90000 and owes 60000; Shifa paid her back 30000; Ahmed paid 60000 and owes 60000. Nobody owes anything.
    expect(Object.fromEntries(s.standing.map((x) => [x.name, x.net]))).toEqual({ Aisha: 0, Ahmed: 0, Shifa: 0 });
    expect(s.transfers).toEqual([]);
    const early = daySheet(data, 'g', '2026-11-10')!;
    expect(early.transfers).toEqual([{ from: 'Ahmed', to: 'Aisha', amount: 30_000 }, { from: 'Shifa', to: 'Aisha', amount: 30_000 }]);
  });
  it('a day with no costs is still a sheet', () => {
    const s = daySheet(data, 'g', '2026-11-12')!;
    expect(s.lines).toEqual([]);
    expect(s.total).toBe(0);
    expect(daySheet(data, 'nope', '2026-11-12')).toBeNull();
  });
});
