import { useSyncExternalStore } from 'react';

// A new layout direction (English <-> Dhivehi) only takes effect on the next launch. Until then the
// app would show half-mirrored screens, so once it is known a restart is needed the whole app is
// covered by a screen that asks for it (see RestartGate). It cannot be dismissed: the only way
// forward is to close and reopen Yusr, which clears it because the direction then matches.
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
