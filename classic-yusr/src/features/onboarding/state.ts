import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'yusr.onboarded';
const read = (): boolean => {
  try {
    return Storage.getItemSync(KEY) === '1';
  } catch {
    return false;
  }
};

// Device-local, like the haptics switch: the intro is about this phone, not about an account.
let done = read();
const listeners = new Set<() => void>();

/** The person saw (or skipped) the intro; it is not shown again on this device. */
export function finishOnboarding(): void {
  done = true;
  try {
    Storage.setItemSync(KEY, '1');
  } catch {
    // Not persisted: the intro may show once more after a restart.
  }
  listeners.forEach((listener) => listener());
}

export const useOnboarded = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => done,
  );
