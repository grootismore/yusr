import { matchesSearch } from '@/lib/search';

it('matches words anywhere, in any case', () => {
  expect(matchesSearch('ooredoo', ['Ooredoo bill', null, 'Bills'])).toBe(true);
  expect(matchesSearch('BILL', ['Ooredoo bill'])).toBe(true);
  expect(matchesSearch('rent', ['Ooredoo bill', 'Bills'])).toBe(false);
});

it('matches a typed number to an amount in laari', () => {
  expect(matchesSearch('2377.76', [237776])).toBe(true);
  expect(matchesSearch('2,377', [237776])).toBe(true);
  expect(matchesSearch('2377', [237776])).toBe(true);
  expect(matchesSearch('500', [50000, 'Gym'])).toBe(true);
  expect(matchesSearch('500', [250000])).toBe(true); // matches inside the amount, like words do
  expect(matchesSearch('999', [50000])).toBe(false);
});

it('shows everything for an empty search', () => {
  expect(matchesSearch('  ', ['anything'])).toBe(true);
});

it('does not read a word as an amount', () => {
  expect(matchesSearch('gym', [50000])).toBe(false);
});
