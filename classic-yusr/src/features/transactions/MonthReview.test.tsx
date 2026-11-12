import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthReview, reviewMonth } from './MonthReview';
import type { Transaction } from './types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: (k: string) => mockStore.get(k) ?? null, setItemSync: (k: string, v: string) => void mockStore.set(k, v) },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, o?: { month?: string }) => (o?.month ? `${key} ${o.month}` : key) }) }));
jest.mock('./format', () => ({ useMonthLabel: () => (m: string) => m }));

const tx = (kind: Transaction['kind'], amount: number, on: string): Transaction =>
  ({ id: `${kind}${on}`, user_id: 'u', account_id: 'a', category_id: 'c', amount_laari: amount, kind, occurred_on: on, note: null, debt_id: null, commitment_id: null, created_at: '', updated_at: '', deleted_at: null }) as Transaction;

describe('month review', () => {
  beforeEach(() => mockStore.clear());

  it('looks back only during the first week of a month', () => {
    expect(reviewMonth('2026-11-03')).toBe('2026-10');
    expect(reviewMonth('2026-11-07')).toBe('2026-10');
    expect(reviewMonth('2026-11-08')).toBeNull();
    expect(reviewMonth('2026-01-02')).toBe('2025-12');
  });

  it('shows last month as plain facts, and stays away when there was nothing', async () => {
    const { rerender } = await render(<MonthReview today="2026-11-03" transactions={[tx('income', 500000, '2026-10-25'), tx('expense', 120000, '2026-10-26')]} privacyMode={false} />);
    expect(screen.getByText('home.reviewTitle 2026-10')).toBeTruthy();
    expect(screen.getByText('home.net')).toBeTruthy();
    await rerender(<MonthReview today="2026-11-03" transactions={[tx('income', 500000, '2026-11-01')]} privacyMode={false} />);
    expect(screen.queryByText('home.reviewTitle 2026-10')).toBeNull();
  });

  it('is gone for that month once hidden', async () => {
    await render(<MonthReview today="2026-11-03" transactions={[tx('income', 500000, '2026-10-25')]} privacyMode={false} />);
    await fireEvent.press(screen.getByText('home.reviewHide'));
    expect(screen.queryByText('home.reviewTitle 2026-10')).toBeNull();
    expect(mockStore.get('yusr.month-review-hidden')).toBe('2026-10');
  });
});
