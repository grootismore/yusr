import { waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

// The real app, launched signed out on a phone for the first time. It must show the intro, and must not redirect to get there.
jest.mock('@/lib/kv', () => {
  const store = new Map<string, string>();
  return { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v), removeItem: async (k: string) => void store.delete(k) };
});
jest.mock('@/lib/supabase', () => ({
  PREVIEW: false,
  getSupabase: () => ({ auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    startAutoRefresh() {}, stopAutoRefresh() {},
  } }),
}));
jest.mock('@/lib/boot', () => ({ previousBoot: null, previousAlive: null, previousVariant: 0, variant: 0, lastGoodVariant: null, VARIANTS: ['normal'], startHeartbeat() {}, markBoot() {} }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: async () => undefined }));
jest.mock('expo-notifications', () => ({ setNotificationHandler() {}, getPermissionsAsync: async () => ({ status: 'denied' }), cancelScheduledNotificationAsync: async () => undefined, SchedulableTriggerInputTypes: { DATE: 'date' } }));
jest.mock('@sentry/react-native', () => ({ init() {}, wrap: (c: unknown) => c, captureException() {} }));

it('first launch, signed out: shows the intro without navigating anywhere', async () => {
  const r = await renderRouter('./app', { initialUrl: '/' });
  await waitFor(() => expect(r.getByText('ދެން')).toBeTruthy(), { timeout: 5000 }); // the intro's Next button
  expect(r.getPathname()).not.toBe('/welcome'); // shown in place: no redirect during launch
}, 20000);
