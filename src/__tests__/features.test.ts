import { FEATURES, featuresInUse, GROUPS, type Usage } from '@/features/features/registry';
import { loadFlags, setFlag, flagValue } from '@/lib/flags';

jest.mock('@/lib/kv', () => {
  const m = new Map<string, string>();
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v); }, removeItem: async (k: string) => { m.delete(k); } };
});

const none: Usage = { debts: 0, ious: 0, split: 0, pools: 0, recurring: 0, household: false, giving: 0, register: 0 };

describe('optional features', () => {
  it('switches on exactly what someone already uses', () => {
    expect(featuresInUse(none)).toEqual([]);
    expect(featuresInUse({ ...none, debts: 2, ious: 1, household: true })).toEqual(['debts', 'household', 'ious']);
    expect(featuresInUse({ ...none, giving: 3, register: 1 })).toEqual(['giving', 'register']);
  });

  it('lists every feature once, in a known group, with its own flag', () => {
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
    expect(new Set(FEATURES.map((f) => f.flag)).size).toBe(FEATURES.length);
    for (const f of FEATURES) expect(GROUPS).toContain(f.group);
  });

  it('starts everything off, and a choice sticks across a restart', async () => {
    await loadFlags();
    for (const f of FEATURES) expect(flagValue(f.flag)).toBe(false);
    expect(flagValue('featuresSeeded')).toBe(false);
    await setFlag('featIous', true);
    await setFlag('featuresSeeded', true);
    await loadFlags(); // a fresh launch reads what was saved
    expect(flagValue('featIous')).toBe(true);
    expect(flagValue('featDebts')).toBe(false);
    expect(flagValue('featuresSeeded')).toBe(true);
  });
});
