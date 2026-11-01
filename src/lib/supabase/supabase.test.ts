import { assertClientSafeKey } from './client';
import { secureStorage, splitIntoChunks } from './storage';

const store = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
}));

const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.sig`;

describe('assertClientSafeKey', () => {
  it('accepts publishable keys and anon JWTs', () => {
    expect(() => assertClientSafeKey('sb_publishable_abc123')).not.toThrow();
    expect(() => assertClientSafeKey(jwt('anon'))).not.toThrow();
  });
  it('refuses secret and service-role keys', () => {
    expect(() => assertClientSafeKey('sb_secret_abc123')).toThrow(/secret key/);
    expect(() => assertClientSafeKey(jwt('service_role'))).toThrow(/service-role/);
  });
  it('refuses a missing key', () => {
    expect(() => assertClientSafeKey('')).toThrow(/Missing/);
  });
});

describe('secureStorage', () => {
  beforeEach(() => store.clear());

  it('splits long values and joins them back exactly', async () => {
    const value = 'x'.repeat(5000) + 'end';
    expect(splitIntoChunks(value).every((c) => c.length <= 1800)).toBe(true);
    await secureStorage.setItem('session', value);
    expect(await secureStorage.getItem('session')).toBe(value);
    expect([...store.keys()].every((k) => k.startsWith('session.'))).toBe(true);
  });

  it('removes stale chunks when a shorter value replaces a longer one', async () => {
    await secureStorage.setItem('session', 'y'.repeat(5000));
    await secureStorage.setItem('session', 'short');
    expect(await secureStorage.getItem('session')).toBe('short');
    expect(store.size).toBe(2); // one chunk + the count
  });

  it('returns null when missing or when a chunk has gone missing', async () => {
    expect(await secureStorage.getItem('nope')).toBeNull();
    await secureStorage.setItem('session', 'z'.repeat(4000));
    store.delete('session.1');
    expect(await secureStorage.getItem('session')).toBeNull();
  });

  it('removeItem deletes everything', async () => {
    await secureStorage.setItem('session', 'z'.repeat(4000));
    await secureStorage.removeItem('session');
    expect(store.size).toBe(0);
  });

  it('round-trips an empty string', async () => {
    await secureStorage.setItem('session', '');
    expect(await secureStorage.getItem('session')).toBe('');
  });
});
