import { useSyncExternalStore } from 'react';
import { getItem, setItem } from './kv';

// Small remembered yes/no choices ("has seen the welcome", "has done first setup"), kept on the device.
export type FlagName = 'onboarded' | 'setupDone';
const cache = new Map<FlagName, boolean>();
const listeners = new Set<() => void>();
const key = (k: FlagName) => `kharadhu.flag.${k}`;
const notify = () => listeners.forEach((l) => l());

export async function loadFlags(names: readonly FlagName[] = ['onboarded', 'setupDone']): Promise<void> {
  await Promise.all(names.map(async (n) => { cache.set(n, (await getItem(key(n))) === '1'); }));
  notify();
}

export async function setFlag(name: FlagName, value: boolean): Promise<void> {
  cache.set(name, value);
  notify();
  await setItem(key(name), value ? '1' : '0');
}

/** true or false once loaded, null while still loading. */
export function useFlag(name: FlagName): boolean | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => (cache.has(name) ? (cache.get(name) as boolean) : null),
  );
}
