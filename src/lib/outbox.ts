import { useSyncExternalStore } from 'react';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { isNetworkError } from './online';

/**
 * Things the person saved while offline, kept on the phone until they can be sent. Every entry carries the ids it will
 * be saved under (made on the phone), so sending it twice, for example after a reply was lost, never makes a duplicate:
 * the server answers "already there" and the entry is done.
 */
export interface OutboxEntry { key: string; op: string; args: unknown; at: number }

let entries: OutboxEntry[] = [];
let loaded = false;
let flushing = false;
const listeners = new Set<() => void>();
const notify = () => { snapshot = entries.length; listeners.forEach((l) => l()); };
let snapshot = 0;

const file = () => new File(Paths.document, 'kharadhu-outbox.json');
const save = async () => {
  if (Platform.OS === 'web') return;
  try { const f = file(); if (!f.exists) f.create(); await f.write(JSON.stringify(entries)); } catch { /* it stays in memory for this run */ }
};

export async function loadOutbox(): Promise<void> {
  if (loaded) return;
  loaded = true;
  if (Platform.OS !== 'web') {
    try { const f = file(); if (f.exists) entries = JSON.parse(await f.text()) as OutboxEntry[]; } catch { entries = []; }
  }
  notify();
}

export const pendingCount = (): number => entries.length;
export const usePending = (): number => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot);

export async function enqueue(key: string, op: string, args: unknown): Promise<void> {
  await loadOutbox();
  entries.push({ key, op, args, at: Date.now() });
  notify();
  await save();
}

export async function clearOutbox(): Promise<void> {
  entries = [];
  notify();
  await save();
}

/** True when the server already has this (the unique id was saved by an earlier try). */
export const isDuplicate = (e: unknown): boolean => /duplicate key|already exists|23505/i.test(e instanceof Error ? e.message : String(e));

/**
 * Send everything waiting, oldest first. Stops quietly at the first request that cannot get through. An entry the server
 * refuses for another reason is dropped and counted, so one bad entry never blocks the rest.
 */
export async function flushOutbox(run: (op: string, args: unknown) => Promise<void>): Promise<{ sent: number; failed: number }> {
  await loadOutbox();
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0, failed = 0;
  try {
    while (entries.length) {
      const next = entries[0];
      try { await run(next.op, next.args); sent += 1; } catch (e) {
        if (isNetworkError(e) || /not signed in/i.test(e instanceof Error ? e.message : '')) break; // keep it for when the session is back
        if (isDuplicate(e)) sent += 1; else failed += 1;
      }
      entries = entries.filter((x) => x.key !== next.key);
      notify();
      await save();
    }
  } finally { flushing = false; }
  return { sent, failed };
}
