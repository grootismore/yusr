import { render, screen, fireEvent } from '@testing-library/react-native';
import { RuleCard } from '@/features/rule/ui';
import type { RuleLine } from '@/features/rule/logic';
import { initI18n } from '@/lib/i18n';

const mockPush = jest.fn();
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: async () => undefined }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/kv', () => {
  const m = new Map<string, string>();
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v); }, removeItem: async (k: string) => { m.delete(k); } };
});

const lines: RuleLine[] = [
  { group: 'needs', target: 500_000, spent: 100_000, percent: 20, state: 'ok' },
  { group: 'wants', target: 300_000, spent: 50_000, percent: 16, state: 'ok' },
  { group: 'savings', target: 200_000, spent: 0, percent: 0, state: 'ok' },
];

describe('the 50/30/20 card', () => {
  beforeAll(async () => { await initI18n(); });
  beforeEach(() => mockPush.mockClear());

  it('opens the rule screen when tapped on a page that links to it', async () => {
    await render(<RuleCard lines={lines} income={1_000_000} />);
    fireEvent.press(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/rule');
  });

  it('does not navigate when it is already on the rule screen', async () => {
    await render(<RuleCard lines={lines} income={1_000_000} link={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
