import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getItem, removeItem, setItem } from './kv';

export const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1'; // web screenshots with fixture data, never in builds

/** The service-role/secret key must never be in the app. Refuse to start if it is. */
export function assertClientSafeKey(key: string): void {
  if (!key) throw new Error('Missing EXPO_PUBLIC_SUPABASE_KEY');
  if (key.startsWith('sb_secret_')) throw new Error('A Supabase secret key must never be used in the app');
  const payload = key.split('.')[1];
  if (payload) {
    let role: unknown;
    try {
      role = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role;
    } catch {
      return; // not a decodable JWT (e.g. a publishable key): nothing more to check
    }
    if (role === 'service_role') throw new Error('The service-role key must never be used in the app');
  }
}

// SecureStore warns above ~2 KB per value and a session is larger: split across numbered keys.
const CHUNK = 1800;
export const splitIntoChunks = (value: string, size = CHUNK): string[] => {
  const out: string[] = [];
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
  return out.length ? out : [''];
};

const sessionStorage = {
  async getItem(key: string) {
    const n = Number(await getItem(`${key}.n`));
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => getItem(`${key}.${i}`)));
    return parts.some((p) => p === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    const chunks = splitIntoChunks(value);
    await Promise.all(chunks.map((c, i) => setItem(`${key}.${i}`, c)));
    await setItem(`${key}.n`, String(chunks.length));
  },
  async removeItem(key: string) {
    const n = Number(await getItem(`${key}.n`));
    await Promise.all(Array.from({ length: n }, (_, i) => removeItem(`${key}.${i}`)));
    await removeItem(`${key}.n`);
  },
};

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';
  if (!url) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  assertClientSafeKey(key);
  client = createClient(url, key, {
    auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return client;
}
