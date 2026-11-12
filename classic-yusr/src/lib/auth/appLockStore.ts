import { useSyncExternalStore } from 'react';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { afterTry, makePinRecord, NO_ATTEMPTS, pinMatches, secondsToWait, type Attempts, type PinRecord } from './pin';

// Everything about the optional app lock lives here, on this phone only. Nothing is sent to a server.
// The lock is OFF until the person turns it on (and has read what it does).
const SETTINGS_KEY = 'yusr.lock.settings';
const PIN_KEY = 'yusr.lock.pin';
const ATTEMPTS_KEY = 'yusr.lock.attempts';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export interface LockState {
  /** False until the stored settings have been read; the app stays covered until then. */
  loaded: boolean;
  enabled: boolean;
  /** Face ID or fingerprint is tried first; the PIN is always the way in if it fails. */
  biometrics: boolean;
}

let state: LockState = { loaded: false, enabled: false, biometrics: false };
const listeners = new Set<() => void>();
const set = (next: Partial<LockState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

/** The current state outside React (for tests and one-off checks). */
export const getLockState = (): LockState => state;

export const useLockState = (): LockState =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

const digest = (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const text = await SecureStore.getItemAsync(key, OPTIONS);
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
const writeJson = (key: string, value: unknown) => SecureStore.setItemAsync(key, JSON.stringify(value), OPTIONS);

/** Reads the saved choice. A lock whose PIN cannot be found counts as off, never as a lock nobody can open. */
export async function loadLock(): Promise<void> {
  const [settings, pin] = await Promise.all([readJson<{ enabled: boolean; biometrics: boolean }>(SETTINGS_KEY), readJson<PinRecord>(PIN_KEY)]);
  set({ loaded: true, enabled: !!settings?.enabled && !!pin, biometrics: !!settings?.biometrics && !!pin });
}

/** Turns the lock on with a new PIN (a first set-up, or after a change). Biometrics keeps its setting. */
export async function enableLock(pin: string): Promise<void> {
  const salt = toHex(await Crypto.getRandomBytesAsync(16));
  await writeJson(PIN_KEY, await makePinRecord(pin, salt, digest));
  await writeJson(ATTEMPTS_KEY, NO_ATTEMPTS);
  await writeJson(SETTINGS_KEY, { enabled: true, biometrics: state.biometrics });
  set({ enabled: true });
}

export async function setBiometrics(on: boolean): Promise<void> {
  await writeJson(SETTINGS_KEY, { enabled: state.enabled, biometrics: on });
  set({ biometrics: on });
}

/** Turns the lock off and forgets the PIN. Also used on sign-out, since the PIN belongs to this phone's user. */
export async function clearLock(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(PIN_KEY, OPTIONS), SecureStore.deleteItemAsync(SETTINGS_KEY, OPTIONS), SecureStore.deleteItemAsync(ATTEMPTS_KEY, OPTIONS)]).catch(() => undefined);
  set({ loaded: true, enabled: false, biometrics: false });
}

export async function waitSeconds(now = Date.now()): Promise<number> {
  return secondsToWait((await readJson<Attempts>(ATTEMPTS_KEY)) ?? NO_ATTEMPTS, now);
}

/** Checks a PIN, counting wrong tries. While waiting after too many, nothing is checked. */
export async function checkPin(pin: string, now = Date.now()): Promise<{ ok: boolean; waitSeconds: number }> {
  const attempts = (await readJson<Attempts>(ATTEMPTS_KEY)) ?? NO_ATTEMPTS;
  const wait = secondsToWait(attempts, now);
  if (wait > 0) return { ok: false, waitSeconds: wait };
  const record = await readJson<PinRecord>(PIN_KEY);
  const ok = !!record && (await pinMatches(pin, record, digest));
  const next = afterTry(attempts, ok, now);
  await writeJson(ATTEMPTS_KEY, next);
  return { ok, waitSeconds: secondsToWait(next, now) };
}
