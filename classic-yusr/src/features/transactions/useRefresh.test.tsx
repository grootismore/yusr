import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRefresh } from './hooks';

jest.mock('@/lib/query/supabaseApi', () => ({ supabaseApi: {} }));
jest.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'id' }));

async function setup() {
  const client = new QueryClient();
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { refetch, ...(await renderHook(() => useRefresh(), { wrapper })) };
}

describe('useRefresh (pull to refresh)', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('re-fetches what is on screen and stops spinning', async () => {
    onlineManager.setOnline(true);
    const { result, refetch } = await setup();
    await act(async () => {
      await result.current.onRefresh();
    });
    expect(refetch).toHaveBeenCalledWith({ type: 'active' });
    expect(result.current.refreshing).toBe(false);
  });

  it('does not wait on the network when offline', async () => {
    onlineManager.setOnline(false);
    const { result, refetch } = await setup();
    await act(async () => {
      await result.current.onRefresh();
    });
    expect(refetch).not.toHaveBeenCalled();
    expect(result.current.refreshing).toBe(false);
  });

  it('stops spinning when the refresh fails', async () => {
    onlineManager.setOnline(true);
    const { result, refetch } = await setup();
    refetch.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.onRefresh();
    });
    expect(result.current.refreshing).toBe(false);
  });
});
