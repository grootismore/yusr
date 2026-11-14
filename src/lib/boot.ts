import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Launch breadcrumbs. Each stage the app reaches is written to the phone (synchronously). If a launch ends before the last
// stage ("ok", three seconds after the first screen), the next launch can say how far it got. A crash inside iOS before any
// JavaScript runs leaves no breadcrumb, which is itself a clue.
const KEY = 'kharadhu.boot';
const safe = <T,>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };

/** How far the previous launch got ("entry", "layout", "i18n", "fonts", "ready", "home" or "ok"), or null on the first launch. Read once, before this launch writes anything. */
export const previousBoot: string | null = Platform.OS === 'web' ? null : safe(() => SecureStore.getItem(KEY), null);

let last = '';
let finished = false;
/** Record a stage. Same stage twice is skipped, and nothing is written once the launch has reached "ok". Stages written while rendering say which screen was being built when a launch ended. */
export function markBoot(stage: string): void {
  if (Platform.OS === 'web' || finished || stage === last) return;
  last = stage;
  if (stage === 'ok') finished = true;
  safe(() => SecureStore.setItem(KEY, stage), undefined);
}
