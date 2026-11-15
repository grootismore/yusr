import { checkPin, clearPin, pinSet, pinWaitSeconds, savePin } from '@/lib/pin';

const mockStore = new Map<string, string>();
jest.mock('@/lib/kv', () => ({
  getItem: async (k: string) => mockStore.get(k) ?? null,
  setItem: async (k: string, v: string) => { mockStore.set(k, v); },
  removeItem: async (k: string) => { mockStore.delete(k); },
}));
jest.mock('expo-crypto', () => {
  const { createHash, randomUUID } = require('crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (a: string, s: string) => createHash(a).update(s).digest('hex'), randomUUID };
});

describe('pin', () => {
  it('stores only a hash and checks it', async () => {
    await savePin('123456');
    expect(await pinSet()).toBe(true);
    expect([...mockStore.values()][0]).not.toContain('123456');
    expect(await checkPin('123456')).toBe(true);
    expect(await checkPin('000000')).toBe(false);
  });
  it('makes you wait after five wrong tries', async () => {
    for (let i = 0; i < 5; i++) await checkPin('111111');
    expect(pinWaitSeconds()).toBeGreaterThan(0);
    expect(await checkPin('123456')).toBe(false);
  });
  it('clears', async () => {
    await clearPin();
    expect(await pinSet()).toBe(false);
  });
});
