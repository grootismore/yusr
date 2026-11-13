import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getItem, removeItem } from './kv';

// Sideloaded builds leave no crash log we can read. If the app dies from a JavaScript error, this keeps the error text
// on the phone (synchronously, before the app closes) so the next launch can show it and the person can send it.
// It cannot see crashes inside native code.
const KEY = 'kharadhu.lastCrash';
type Handler = (error: unknown, fatal?: boolean) => void;

export function installCrashNote(): void {
  if (Platform.OS === 'web') return;
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void } }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    if (fatal) {
      try {
        const e = error as { message?: string; stack?: string };
        SecureStore.setItem(KEY, `${new Date().toISOString()}\n${e?.message ?? String(error)}\n${e?.stack ?? ''}`.slice(0, 1800));
      } catch { /* nothing more we can do */ }
    }
    previous(error, fatal);
  });
}

export const readCrashNote = (): Promise<string | null> => getItem(KEY);
export const clearCrashNote = (): Promise<void> => removeItem(KEY);
