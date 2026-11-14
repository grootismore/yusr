import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getItem, removeItem } from './kv';

// Sideloaded builds leave no crash log we can read. If the app dies from a JavaScript error, this keeps the error text
// on the phone (synchronously, before the app closes) so the next launch can show it and the person can send it.
// It cannot see crashes inside native code.
const KEY = 'kharadhu.lastCrash';
type Handler = (error: unknown, fatal?: boolean) => void;

const text = (error: unknown): string => {
  const e = error as { message?: string; stack?: string };
  return `${new Date().toISOString()}\n${e?.message ?? String(error)}\n${e?.stack ?? ''}`.slice(0, 1800);
};

// While the error screen is mounted it takes the error instead of letting iOS close the app.
let shower: ((message: string) => void) | null = null;
export function showErrorsHere(fn: ((message: string) => void) | null): void { shower = fn; }
export const describeError = text;

export function installCrashNote(): void {
  if (Platform.OS === 'web') return;
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void } }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    if (fatal) {
      try { SecureStore.setItem(KEY, text(error)); } catch { /* nothing more we can do */ }
      if (shower) { shower(text(error)); return; } // shown on screen: the app stays open
    }
    previous(error, fatal);
  });
}

export const readCrashNote = (): Promise<string | null> => getItem(KEY);
export const clearCrashNote = (): Promise<void> => removeItem(KEY);
