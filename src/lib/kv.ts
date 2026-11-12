import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Small key-value store for settings: Keychain/Keystore on devices, localStorage on web (preview).
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return SecureStore.getItemAsync(key).catch(() => null);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
    return;
  }
  await SecureStore.setItemAsync(key, value).catch(() => undefined);
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
    return;
  }
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
}
