import { waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { redirectAllowed, resetRedirectGuard } from '@/lib/gate';

// Someone already signed in (the sign-in is kept in the phone's keychain, even across a reinstall) whose launch is dropped
// on the fallback screen, as phones do. The app must show what they need in place and never bounce between screens.
jest.mock('@/lib/kv', () => {
  const store = new Map<string, string>();
  return { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v), removeItem: async (k: string) => void store.delete(k) };
});
jest.mock('@/lib/supabase', () => ({
  PREVIEW: false,
  getSupabase: () => ({ auth: {
    getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@example.test' } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    startAutoRefresh() {}, stopAutoRefresh() {},
  } }),
}));
jest.mock('@/data/api', () => new Proxy({}, { get: (_t, k) => {
  if (k === '__esModule') return true;
  if (k === 'listConsents') return async () => ['terms', 'privacy', 'age_18'].map((kind) => ({ kind, version: '2026-11-15' }));
  if (k === 'DEFAULT_PLAN') return {};
  return async () => [];
} }));
jest.mock('@/lib/boot', () => ({ previousBoot: null, previousAlive: null, previousVariant: 0, variant: 0, lastGoodVariant: null, VARIANTS: ['normal'], startHeartbeat() {}, markBoot() {} }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: async () => undefined }));
jest.mock('expo-notifications', () => ({ setNotificationHandler() {}, getPermissionsAsync: async () => ({ status: 'denied' }), cancelScheduledNotificationAsync: async () => undefined, SchedulableTriggerInputTypes: { DATE: 'date' } }));
jest.mock('@sentry/react-native', () => ({ init() {}, wrap: (c: unknown) => c, captureException() {} }));

it('signed in, setup not done, dropped on the fallback screen: the setup question is shown in place', async () => {
  const r = await renderRouter('./app', { initialUrl: '/accept' });
  await waitFor(() => expect(r.getByText('މިއީ ކާކުގެ ބޭނުމަށް؟')).toBeTruthy(), { timeout: 6000 }); // the first setup question
  expect(r.getPathname()).toBe('/accept'); // no redirect was needed to get there
}, 20000);

describe('redirect-loop guard', () => {
  beforeEach(() => resetRedirectGuard());
  it('allows a few redirects, then refuses', () => {
    expect([redirectAllowed(0), redirectAllowed(100), redirectAllowed(200), redirectAllowed(300)]).toEqual([true, true, true, false]);
  });
  it('allows again once things have been quiet for a while', () => {
    redirectAllowed(0); redirectAllowed(1); redirectAllowed(2);
    expect(redirectAllowed(6000)).toBe(true);
  });
});
