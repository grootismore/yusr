import { useSyncExternalStore } from 'react';

// Whether the last request to our server got through. Set by the network wrapper in supabase.ts; read by the banner.
let online = true;
const listeners = new Set<() => void>();
export function setOnline(value: boolean): void {
  if (value === online) return;
  online = value;
  listeners.forEach((l) => l());
}
export const useOnline = (): boolean => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => online);

/** A request that never reached the server (no signal, or it took too long). */
export const isNetworkError = (e: unknown): boolean => {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /network request failed|failed to fetch|aborterror|timeout|offline|load failed/i.test(m);
};
