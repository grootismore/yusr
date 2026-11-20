import { groupOf, ruleSplit } from '@/features/rule/logic';

const cats = [
  { id: 'rent', slug: 'rent' }, { id: 'shop', slug: 'shopping' }, { id: 'give', slug: 'giving' }, { id: 'mine', slug: null },
];

it('splits income 50/30/20 and puts spending in the right bucket', () => {
  const lines = ruleSplit({ income: 1_000_000, spentBy: new Map([['rent', 400_000], ['shop', 350_000], ['give', 50_000], ['mine', 10_000]]), categories: cats, overrides: {}, debtPaid: 100_000 });
  const [needs, wants, savings] = lines;
  expect([needs.target, wants.target, savings.target]).toEqual([500_000, 300_000, 200_000]);
  expect(needs.spent).toBe(400_000);
  expect(needs.state).toBe('near'); // 80% of the ceiling
  expect(wants.spent).toBe(360_000); // shopping plus a custom category
  expect(wants.state).toBe('over');
  expect(savings.spent).toBe(150_000); // giving plus debt payments
  expect(savings.state).toBe('ok');
});

it('savings reach their goal instead of going over', () => {
  const [, , savings] = ruleSplit({ income: 1_000_000, spentBy: new Map([['give', 250_000]]), categories: cats, overrides: {}, debtPaid: 0 });
  expect(savings.state).toBe('reached');
  expect(savings.percent).toBe(100);
});

it('a person can move a category, and uncategorised spending counts as wants', () => {
  expect(groupOf(cats[0], { rent: 'wants' })).toBe('wants');
  expect(groupOf({ id: 'x', slug: 'transport' }, {})).toBe('needs');
  const [, wants] = ruleSplit({ income: 1_000_000, spentBy: new Map([[null, 5_000]]), categories: cats, overrides: {}, debtPaid: 0 });
  expect(wants.spent).toBe(5_000);
});
