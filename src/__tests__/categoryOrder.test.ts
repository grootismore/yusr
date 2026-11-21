import { categoriesByUse } from '@/lib/categoryOrder';

const cats = ['food', 'transport', 'bills', 'rent', 'other'].map((id) => ({ id }));

it('puts the most used categories first and keeps the usual order for the rest', () => {
  const spending = [{ category_id: 'bills' }, { category_id: 'bills' }, { category_id: 'transport' }, { category_id: null }, { category_id: 'rent' }];
  expect(categoriesByUse(cats, spending).map((c) => c.id)).toEqual(['bills', 'transport', 'rent', 'food', 'other']);
});

it('leaves the order alone when nothing has been spent', () => {
  expect(categoriesByUse(cats, []).map((c) => c.id)).toEqual(['food', 'transport', 'bills', 'rent', 'other']);
});

it('ignores spending in a category that no longer exists', () => {
  expect(categoriesByUse(cats, [{ category_id: 'gone' }, { category_id: 'gone' }]).map((c) => c.id)).toEqual(['food', 'transport', 'bills', 'rent', 'other']);
});
