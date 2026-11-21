import { categoryChips, totalsByDay } from '@/features/activity/logic';

describe('a day in the history', () => {
  it('adds up what was spent and what came in on each day', () => {
    const m = totalsByDay([
      { date: '2026-11-08', kind: 'expense', laari: 38_000 }, { date: '2026-11-08', kind: 'expense', laari: 12_000 },
      { date: '2026-11-08', kind: 'income', laari: 250_000 }, { date: '2026-11-07', kind: 'expense', laari: 5_000 },
    ]);
    expect(m.get('2026-11-08')).toEqual({ spent: 50_000, received: 250_000 });
    expect(m.get('2026-11-07')).toEqual({ spent: 5_000, received: 0 });
    expect(m.get('2026-11-01')).toBeUndefined();
  });
});

describe('category chips', () => {
  it('lists the categories spent on, biggest first, without uncategorised rows', () => {
    expect(categoryChips([
      { category_id: 'food', laari: 100 }, { category_id: 'rent', laari: 900 }, { category_id: null, laari: 5_000 }, { category_id: 'food', laari: 300 },
    ])).toEqual(['rent', 'food']);
  });
  it('keeps at most the limit', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id, i) => ({ category_id: id, laari: 100 - i }));
    expect(categoryChips(rows, 2)).toEqual(['a', 'b']);
  });
});
