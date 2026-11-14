import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// On a device every call gives up after two seconds (a stuck keychain must never leave the app on a blank screen).
const limit = <T,>(p: Promise<T>, fallback: T): Promise<T> => Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), 2000))]);

// Small key-value store for settings: Keychain/Keystore on devices, localStorage on web (preview).
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return limit(SecureStore.getItemAsync(key), null);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
    return;
  }
  await limit(SecureStore.setItemAsync(key, value), undefined);
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
    return;
  }
  await limit(SecureStore.deleteItemAsync(key), undefined);
}
