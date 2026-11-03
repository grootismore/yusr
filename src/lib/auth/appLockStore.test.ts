/* eslint-disable @typescript-eslint/no-require-imports */
const mockStorage = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockStorage.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockStorage.delete(key)),
}));
jest.mock('expo-crypto', () => {
  const { createHash } = require('node:crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_algorithm: string, text: string) => createHash('sha256').update(text).digest('hex'),
    getRandomBytesAsync: async (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256),
  };
});

type Store = typeof import('./appLockStore');
const fresh = (): Store => {
  let store!: Store;
  jest.isolateModules(() => {
    store = require('./appLockStore') as Store;
  });
  return store;
};

beforeEach(() => mockStorage.clear());

describe('app lock storage', () => {
  it('is off until the person turns it on, and keeps only a hash of the PIN', async () => {
    const lock = fresh();
    await lock.loadLock();
    expect(await lock.checkPin('123456')).toMatchObject({ ok: false }); // nothing set yet
    await lock.enableLock('123456');
    expect(JSON.stringify([...mockStorage.values()])).not.toContain('123456');
    expect((await lock.checkPin('123456')).ok).toBe(true);
    expect((await lock.checkPin('654321')).ok).toBe(false);
  });

  it('survives a restart: the saved choice is read back', async () => {
    const first = fresh();
    await first.enableLock('123456');
    await first.setBiometrics(true);
    const second = fresh(); // a new launch
    await second.loadLock();
    expect(await second.checkPin('123456')).toMatchObject({ ok: true });
  });

  it('makes the person wait after five wrong tries, even for the right PIN', async () => {
    const lock = fresh();
    await lock.enableLock('123456');
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) expect(await lock.checkPin('000000', t0)).toMatchObject({ ok: false, waitSeconds: 0 });
    expect(await lock.checkPin('000000', t0)).toMatchObject({ ok: false, waitSeconds: 30 });
    expect(await lock.checkPin('123456', t0 + 5_000)).toMatchObject({ ok: false, waitSeconds: 25 }); // not even checked
    expect(await lock.checkPin('123456', t0 + 31_000)).toMatchObject({ ok: true });
    expect(await lock.waitSeconds(t0 + 31_000)).toBe(0);
  });

  it('turning it off forgets the PIN and every setting', async () => {
    const lock = fresh();
    await lock.enableLock('123456');
    await lock.clearLock();
    expect(mockStorage.size).toBe(0);
    expect((await lock.checkPin('123456')).ok).toBe(false);
  });

  it('a lock whose PIN is missing counts as off, never as a lock nobody can open', async () => {
    mockStorage.set('yusr.lock.settings', JSON.stringify({ enabled: true, biometrics: true }));
    const lock = fresh();
    await lock.loadLock();
    expect(lock.getLockState()).toMatchObject({ loaded: true, enabled: false, biometrics: false });
  });
});
