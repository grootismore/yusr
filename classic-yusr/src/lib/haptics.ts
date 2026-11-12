import { useSyncExternalStore } from 'react';
import * as Haptics from 'expo-haptics';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'yusr.haptics-enabled';
const read = (): boolean => {
  try {
    return Storage.getItemSync(KEY) !== '0'; // on unless the person turned it off
  } catch {
    return true;
  }
};

// Device-local, like the reminders switch: HIG asks that haptics can be turned off.
let enabled = read();
const listeners = new Set<() => void>();

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  try {
    Storage.setItemSync(KEY, value ? '1' : '0');
  } catch {
    // Not persisted; applies for this session.
  }
  listeners.forEach((listener) => listener());
}

export const useHapticsEnabled = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
  );

const play = (run: () => Promise<void>) => {
  if (enabled) run().catch(() => undefined); // a missing haptic engine is never an error
};

/** A choice changed (segmented control, chip). */
export const selectionHaptic = () => play(() => Haptics.selectionAsync());
/** A task finished (saved). */
export const successHaptic = () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
/** A destructive action went ahead. */
export const warningHaptic = () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
