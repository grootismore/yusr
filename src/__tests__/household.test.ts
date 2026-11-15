import { nameOf, summarize, type HouseholdEntry, type HouseholdMember } from '@/features/household/logic';

const members: HouseholdMember[] = [{ user_id: 'a', display_name: 'Aisha', role: 'owner' }, { user_id: 'b', display_name: 'Ahmed', role: 'member' }];
const e = (id: string, user_id: string, kind: 'expense' | 'income', mvr_laari: number): HouseholdEntry => ({ id, household_id: 'h', user_id, kind, amount_laari: mvr_laari, currency: 'MVR', fx_rate_to_mvr: 1, mvr_laari, category_id: null, merchant: null, note: null, entry_date: '2026-11-10' });

describe('household summary', () => {
  it('adds up what the household spent and took in, and what each person paid and received', () => {
    const s = summarize([e('1', 'a', 'expense', 250_000), e('2', 'b', 'expense', 100_000), e('3', 'b', 'expense', 50_000), e('4', 'a', 'income', 1_000_000)], members);
    expect(s.spent).toBe(400_000);
    expect(s.income).toBe(1_000_000);
    expect(s.left).toBe(600_000);
    expect(s.members.find((m) => m.user_id === 'a')).toMatchObject({ name: 'Aisha', paid: 250_000, received: 1_000_000 });
    expect(s.members.find((m) => m.user_id === 'b')).toMatchObject({ name: 'Ahmed', paid: 150_000, received: 0 });
  });
  it('keeps entries by someone who has since left, and finds names', () => {
    const s = summarize([e('1', 'gone', 'expense', 10_000)], members);
    expect(s.spent).toBe(10_000);
    expect(s.members).toHaveLength(3);
    expect(nameOf(members, 'b')).toBe('Ahmed');
    expect(nameOf(members, 'x')).toBe('');
  });
});
