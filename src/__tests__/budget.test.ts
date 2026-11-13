import { budgetState, effectiveBudgets, percentUsed } from '@/lib/budget';
import { checkTotals } from '@/lib/receipt';

const rows = [
  { id: '1', month: '2026-09-01', category_id: null, limit_laari: 100000 },
  { id: '2', month: '2026-11-01', category_id: null, limit_laari: 150000 },
  { id: '3', month: '2026-10-01', category_id: 'food', limit_laari: 40000 },
];

it('limits carry forward from the latest earlier month', () => {
  expect(effectiveBudgets(rows, '2026-10-01').get(null)).toBe(100000);
  expect(effectiveBudgets(rows, '2026-12-01').get(null)).toBe(150000);
  expect(effectiveBudgets(rows, '2026-09-01').get('food')).toBeUndefined();
  expect(effectiveBudgets(rows, '2026-12-01').get('food')).toBe(40000);
});

it('states: none, ok, near (80%), over', () => {
  expect(budgetState(500, undefined)).toBe('none');
  expect(budgetState(7999, 10000)).toBe('ok');
  expect(budgetState(8000, 10000)).toBe('near');
  expect(budgetState(10000, 10000)).toBe('near');
  expect(budgetState(10001, 10000)).toBe('over');
  expect(percentUsed(15000, 10000)).toBe(100);
});

describe('receipt total check (same rule as the server)', () => {
  const base = { items: [9000, 4000], gst: 800, service: 0, discount: 0 };
  it('GST on top matches', () => expect(checkTotals({ ...base, total: 13800, includesGst: false }).match).toBe(true));
  it('GST included matches without adding it', () => expect(checkTotals({ ...base, total: 13000, includesGst: true }).match).toBe(true));
  it('unknown: either reading is accepted', () => {
    expect(checkTotals({ ...base, total: 13800, includesGst: null }).match).toBe(true);
    expect(checkTotals({ ...base, total: 13000, includesGst: null }).match).toBe(true);
  });
  it('a wrong total is flagged', () => expect(checkTotals({ ...base, total: 15000, includesGst: false }).match).toBe(false));
  it('service charge and discount count', () => expect(checkTotals({ items: [10000], gst: 880, service: 1000, discount: 500, total: 11380, includesGst: false }).match).toBe(true));
});
