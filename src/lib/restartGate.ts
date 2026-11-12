import { useSyncExternalStore } from 'react';

// A new layout direction (English <-> Dhivehi) only takes effect on the next launch. Until then
// the app would show half-mirrored screens, so once a restart is needed the whole app is covered
// by a screen that asks for it (RestartGate). It clears itself on relaunch: the direction then matches.
let required = false;
const listeners = new Set<() => void>();

export function requireRestart(): void {
  required = true;
  listeners.forEach((listener) => listener());
}

export const restartRequired = (): boolean => required;

export const useRestartRequired = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => required,
  );
