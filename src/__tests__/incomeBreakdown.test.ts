import { incomeBreakdown } from '@/features/income/logic';
import type { IncomeRow } from '@/data/api';
import type { HouseholdEntry, HouseholdMember } from '@/features/household/logic';

const labels = { you: 'You', income: 'Income', someone: 'Someone' };
const members: HouseholdMember[] = [{ user_id: 'me', display_name: 'Areesh', role: 'owner' }, { user_id: 'her', display_name: 'Nanns', role: 'member' }];
const own = (id: string, note: string | null, mvr: number, currency = 'MVR', minor = mvr, date = '2026-11-28'): IncomeRow => ({ id, amount_laari: minor, currency, mvr_laari: mvr, received_at: date, note });
const shared = (id: string, user: string, note: string | null, mvr: number): HouseholdEntry => ({ id, household_id: 'h', user_id: user, kind: 'income', amount_laari: mvr, currency: 'MVR', fx_rate_to_mvr: 1, mvr_laari: mvr, category_id: null, merchant: null, note, entry_date: '2026-11-15' });

it('adds your income to the shared pot, like the Home tile does', () => {
  const b = incomeBreakdown([own('a', 'Salary', 100_000)], [shared('s', 'her', 'Towards the household', 50_000)], members, 'me', labels);
  expect(b.total).toBe(150_000);
  expect(b.byPerson.map((p) => [p.name, p.total])).toEqual([['You', 100_000], ['Nanns', 50_000]]);
});

it('shows no per-person split when only you earned', () => {
  expect(incomeBreakdown([own('a', 'Salary', 100_000)], [], members, 'me', labels).byPerson).toEqual([]);
});

it('counts income you put in the shared pot as yours', () => {
  const b = incomeBreakdown([], [shared('s1', 'me', 'Salary', 80_000), shared('s2', 'her', 'Salary', 70_000)], members, 'me', labels);
  expect(b.byPerson.map((p) => [p.name, p.total])).toEqual([['You', 80_000], ['Nanns', 70_000]]);
  expect(b.bySource).toHaveLength(1); // both are called Salary
  expect(b.bySource[0].total).toBe(150_000);
});

it('turns a split payday into one source with its currencies listed', () => {
  const b = incomeBreakdown([own('m', 'Salary', 500_000), own('u', 'Salary', 1_141_080, 'USD', 74_000)], [], members, 'me', labels);
  expect(b.bySource).toHaveLength(1);
  expect(b.bySource[0].currencies).toEqual([{ currency: 'MVR', minor: 500_000, mvr: 500_000 }, { currency: 'USD', minor: 74_000, mvr: 1_141_080 }]);
  expect(b.foreign).toEqual([{ currency: 'USD', minor: 74_000, mvr: 1_141_080 }]);
});

it('names an entry with no note "Income", sorts sources by size and entries newest first', () => {
  const b = incomeBreakdown([own('a', null, 10_000, 'MVR', 10_000, '2026-11-02'), own('b', 'Rent', 90_000, 'MVR', 90_000, '2026-11-20')], [], members, 'me', labels);
  expect(b.bySource.map((s) => s.name)).toEqual(['Rent', 'Income']);
  expect(b.entries.map((e) => e.id)).toEqual(['b', 'a']);
});
