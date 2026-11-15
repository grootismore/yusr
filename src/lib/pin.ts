import * as Crypto from 'expo-crypto';
import { getItem, removeItem, setItem } from './kv';

const KEY = 'kharadhu.pin';
export const PIN_LENGTH = 6;
const MAX_TRIES = 5;
const WAIT_MS = 30_000;

const hash = (salt: string, pin: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export const pinSet = async (): Promise<boolean> => !!(await getItem(KEY));
export const clearPin = (): Promise<void> => removeItem(KEY);

/** Keeps only a salted hash, in the keychain. */
export async function savePin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  await setItem(KEY, `${salt}:${await hash(salt, pin)}`);
}

let misses = 0;
let waitUntil = 0;
/** Seconds left before another try is allowed (0 = free to try). Five wrong tries in a row cost 30 seconds. */
export const pinWaitSeconds = (): number => Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000));

export async function checkPin(pin: string): Promise<boolean> {
  if (pinWaitSeconds() > 0) return false;
  const stored = await getItem(KEY);
  if (!stored) return true;
  const [salt, want] = stored.split(':');
  if ((await hash(salt, pin)) === want) { misses = 0; return true; }
  if (++misses >= MAX_TRIES) { misses = 0; waitUntil = Date.now() + WAIT_MS; }
  return false;
}
