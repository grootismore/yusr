import { loadFlags, setFlag } from '@/lib/flags';
import * as kv from '@/lib/kv';
jest.mock('@/lib/kv', () => {
  const store = new Map<string, string>();
  return { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v), removeItem: async (k: string) => void store.delete(k) };
});

it('flags default to false, persist, and reload', async () => {
  await loadFlags();
  await setFlag('onboarded', true);
  expect(await kv.getItem('kharadhu.flag.onboarded')).toBe('1');
  expect(await kv.getItem('kharadhu.flag.setupDone')).toBeNull();
  await loadFlags(); // a fresh launch reads what was saved
});
