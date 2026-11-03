import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'yusr.getting-started-hidden';
const read = (): boolean => {
  try {
    return Storage.getItemSync(KEY) === '1';
  } catch {
    return false;
  }
};

// Device-local, like the intro flag: whether to keep showing the "Getting started" card on Home.
let hidden = read();
const listeners = new Set<() => void>();

export function hideGettingStarted(): void {
  hidden = true;
  try {
    Storage.setItemSync(KEY, '1');
  } catch {
    // Not persisted: the card may come back after a restart.
  }
  listeners.forEach((listener) => listener());
}

export const useGettingStartedHidden = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => hidden,
  );

export type StepKey = 'transaction' | 'debt' | 'plan';

/** Which steps are still open. Empty when everything is done, so the card goes away by itself. */
export const openSteps = (done: Record<StepKey, boolean>): StepKey[] => (['transaction', 'debt', 'plan'] as const).filter((step) => !done[step]);
