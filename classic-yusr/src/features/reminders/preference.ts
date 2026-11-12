import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'yusr.reminders-enabled';
const read = (): boolean => {
  try {
    return Storage.getItemSync(KEY) === '1';
  } catch {
    return false;
  }
};

// ponytail: a device-local switch (notifications are per device anyway), shared by Settings and the sync hook.
let enabled = read();
const listeners = new Set<() => void>();

export function setRemindersEnabled(value: boolean): void {
  enabled = value;
  try {
    Storage.setItemSync(KEY, value ? '1' : '0');
  } catch {
    // Not persisted; applies for this session.
  }
  listeners.forEach((listener) => listener());
}

export const remindersEnabledNow = (): boolean => enabled;

export const useRemindersEnabled = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
  );
