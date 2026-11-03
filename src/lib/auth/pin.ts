/**
 * The rules for Yusr's own PIN, kept free of storage and native code so they can be tested.
 * The PIN is 6 digits. Only a salted SHA-256 of it is ever stored, on this phone, in the system's
 * secure storage; it is never sent anywhere. Ceiling: six digits can be guessed offline by anyone
 * who can read that storage, so the real protection is the phone's own secure storage plus the wait
 * after wrong tries (below). Face ID / fingerprint, when the person turns it on, is checked by the
 * phone itself.
 */
export const PIN_LENGTH = 6;

export const isValidPin = (pin: string): boolean => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

/** A function that returns the SHA-256 of a string as hex (expo-crypto in the app). */
export type Digest = (text: string) => Promise<string>;

export interface PinRecord {
  salt: string;
  hash: string;
}

export const hashPin = (pin: string, salt: string, digest: Digest): Promise<string> => digest(`${salt}:${pin}`);

export async function makePinRecord(pin: string, salt: string, digest: Digest): Promise<PinRecord> {
  return { salt, hash: await hashPin(pin, salt, digest) };
}

/** Same-length comparison that does not stop at the first difference. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function pinMatches(pin: string, record: PinRecord, digest: Digest): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  return sameHex(await hashPin(pin, record.salt, digest), record.hash);
}

export interface Attempts {
  /** Wrong tries in a row. */
  failures: number;
  /** Epoch milliseconds until which no try is accepted (0 = not waiting). */
  lockedUntil: number;
}

export const NO_ATTEMPTS: Attempts = { failures: 0, lockedUntil: 0 };

/** Five free tries, then a wait that doubles from 30 seconds up to one hour. */
export const FREE_TRIES = 5;
const BASE_WAIT_MS = 30_000;
const MAX_WAIT_MS = 60 * 60 * 1000;

export function afterTry(previous: Attempts, correct: boolean, now: number): Attempts {
  if (correct) return NO_ATTEMPTS;
  const failures = previous.failures + 1;
  if (failures < FREE_TRIES) return { failures, lockedUntil: 0 };
  const wait = Math.min(BASE_WAIT_MS * 2 ** (failures - FREE_TRIES), MAX_WAIT_MS);
  return { failures, lockedUntil: now + wait };
}

/** Whole seconds still to wait, or 0 when a try is allowed. */
export const secondsToWait = (attempts: Attempts, now: number): number => Math.max(0, Math.ceil((attempts.lockedUntil - now) / 1000));
