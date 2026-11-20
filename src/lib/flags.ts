import { useSyncExternalStore } from 'react';
import { getItem, setItem } from './kv';

// Small remembered yes/no choices ("has seen the welcome", "has done first setup"), kept on the device.
export type FlagName = 'onboarded' | 'setupDone' | 'hideAmounts' | 'heldOpen' | 'shareByDefault' | 'thaanaKeyboard' | 'rule503020';
const ALL: readonly FlagName[] = ['onboarded', 'setupDone', 'hideAmounts', 'heldOpen', 'shareByDefault', 'thaanaKeyboard', 'rule503020'];
const DEFAULT_ON: ReadonlySet<FlagName> = new Set(['thaanaKeyboard']);
const cache = new Map<FlagName, boolean>();
const listeners = new Set<() => void>();
const key = (k: FlagName) => `kharadhu.flag.${k}`;
const notify = () => listeners.forEach((l) => l());

export async function loadFlags(names: readonly FlagName[] = ALL): Promise<void> {
  // A choice nobody has made yet reads as on for the flags that default to on.
  await Promise.all(names.map(async (n) => { const raw = await getItem(key(n)); cache.set(n, raw === null ? DEFAULT_ON.has(n) : raw === '1'); }));
  notify();
}

export async function setFlag(name: FlagName, value: boolean): Promise<void> {
  cache.set(name, value);
  notify();
  await setItem(key(name), value ? '1' : '0');
}

/** The loaded value of a flag (false before loading). */
export const flagValue = (name: FlagName): boolean => cache.get(name) ?? false;

/** true or false once loaded, null while still loading. */
export function useFlag(name: FlagName): boolean | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => (cache.has(name) ? (cache.get(name) as boolean) : null),
  );
}
