import { render, screen, act } from '@testing-library/react-native';
import { Money } from '@/components/Money';
import { loadFlags } from '@/lib/flags';
import { setHideAmounts } from '@/lib/privacy';

jest.mock('@/lib/kv', () => {
  const m = new Map<string, string>();
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v); }, removeItem: async (k: string) => { m.delete(k); } };
});

describe('hide amounts', () => {
  it('shows money, then blanks it everywhere Money is used, then shows it again', async () => {
    await loadFlags();
    await render(<Money laari={123450} />);
    expect(screen.getByText('MVR 1,234.50', { exact: false })).toBeTruthy();
    await act(async () => { await setHideAmounts(true); });
    expect(screen.queryByText('MVR 1,234.50', { exact: false })).toBeNull();
    expect(screen.getByText('MVR ••••', { exact: false })).toBeTruthy();
    await act(async () => { await setHideAmounts(false); });
    expect(screen.getByText('MVR 1,234.50', { exact: false })).toBeTruthy();
  });
});
