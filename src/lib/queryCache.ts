import { File, Paths } from 'expo-file-system';
import type { Persister } from '@tanstack/react-query-persist-client';

/**
 * What the app remembers on the phone so it opens and shows your last-seen figures with no signal. Only the
 * person's own money records: nothing from the Wasiyyah & Amanah register, trusted people, check-ins or agreements.
 * It is cleared on sign-out.
 */
export const KEEP: ReadonlySet<string> = new Set([
  'expenses', 'income', 'kept-income', 'conversions', 'budgets', 'categories', 'debts', 'debt-payments',
  'giving', 'giving-commitments', 'pools', 'pool-payments', 'recurring', 'recurring-runs', 'zakat', 'trend', 'profile', 'rates', 'scans',
]);

export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const file = () => new File(Paths.document, 'kharadhu-cache.json');

export const persister: Persister = {
  persistClient: async (client) => {
    try { const f = file(); if (!f.exists) f.create(); await f.write(JSON.stringify(client)); } catch { /* the cache is a convenience: never break the app for it */ }
  },
  restoreClient: async () => {
    try { const f = file(); return f.exists ? JSON.parse(await f.text()) : undefined; } catch { return undefined; }
  },
  removeClient: async () => {
    try { const f = file(); if (f.exists) f.delete(); } catch { /* nothing to remove */ }
  },
};
