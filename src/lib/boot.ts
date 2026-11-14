import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Launch breadcrumbs. Each stage the app reaches is written to the phone (synchronously). If a launch ends before the last
// stage ("ok", three seconds after the first screen), the next launch can say how far it got. A crash inside iOS before any
// JavaScript runs leaves no breadcrumb, which is itself a clue.
const KEY = 'kharadhu.boot';
const safe = <T,>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };

/** How far the previous launch got ("entry", "layout", "i18n", "fonts", "ready", "home" or "ok"), or null on the first launch. Read once, before this launch writes anything. */
export const previousBoot: string | null = Platform.OS === 'web' ? null : safe(() => SecureStore.getItem(KEY), null);

// Launch experiments. After a launch that did not reach "ok", the next one runs with one suspect switched off, in turn:
// 0 normal, 1 no right-to-left wrapper, 2 no Sentry. A launch that reaches "ok"
// records which variant it was. This lets the phone itself say which part makes the app close.
export const VARIANTS = ['normal', 'no direction wrapper', 'no Sentry'] as const;
const num = (v: string | null): number => (v !== null && /^\d+$/.test(v) ? Number(v) : 0);
const failedBefore = previousBoot !== null && previousBoot !== 'ok';
/** The variant the previous launch ran, and the one this launch runs. */
export const previousVariant: number = Platform.OS === 'web' ? 0 : num(safe(() => SecureStore.getItem(`${KEY}.variant`), null));
export const variant: number = Platform.OS === 'web' ? 0 : failedBefore ? (previousVariant + 1) % VARIANTS.length : 0;
/** The variant of the last launch that stayed alive, if any. */
export const lastGoodVariant: string | null = Platform.OS === 'web' ? null : safe(() => SecureStore.getItem(`${KEY}.good`), null);
if (Platform.OS !== 'web') safe(() => SecureStore.setItem(`${KEY}.variant`, String(variant)), undefined);

let last = '';
let finished = false;
let writes = 0;
/** Record a stage. Same stage twice is skipped, and nothing is written once the launch has reached "ok". Stages written while rendering say which screen was being built when a launch ended. */
/** While the launch has not reached "ok", writes alive-1, alive-2 ... once a second. If the next launch shows alive-2, the JavaScript thread stopped two seconds in (a hang or a crash); a high number means JavaScript kept running (a frozen screen). */
export function startHeartbeat(): void {
  if (Platform.OS === 'web') return;
  let n = 0;
  const id = setInterval(() => {
    if (finished || ++n > 30) { clearInterval(id); return; }
    safe(() => SecureStore.setItem(`${KEY}.alive`, String(n)), undefined);
  }, 1000);
}
export const previousAlive: string | null = Platform.OS === 'web' ? null : safe(() => SecureStore.getItem(`${KEY}.alive`), null);

export function markBoot(stage: string): void {
  if (Platform.OS === 'web' || finished || stage === last) return;
  if (++writes > 60 && stage !== 'ok') return; // a redirect loop must not hammer the keychain
  last = stage;
  if (stage === 'ok') { finished = true; safe(() => SecureStore.setItem(`${KEY}.good`, String(variant)), undefined); }
  safe(() => SecureStore.setItem(KEY, stage), undefined);
}
