import { act, renderHook } from '@testing-library/react-native';
import { useGate, WAIT_MS } from '@/lib/gate';

let mockAuth = { signedIn: true, loading: true };
jest.mock('@/lib/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/data/hooks', () => ({ useConsents: () => ({ isLoading: false, isSuccess: false, data: undefined }) }));
jest.mock('@/lib/flags', () => ({ useFlag: () => true }));

describe('useGate with no signal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('stops waiting after a few seconds instead of leaving a blank screen', async () => {
    mockAuth = { signedIn: true, loading: true };
    const { result } = await renderHook(() => useGate());
    expect(result.current.waiting).toBe(true);
    await act(async () => { jest.advanceTimersByTime(WAIT_MS + 100); });
    expect(result.current.waiting).toBe(false);
  });
});
