import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secureStorage } from './storage';

/** Rule 2: the service-role key must never be in the client. Refuse to start if it is. */
export function assertClientSafeKey(key: string): void {
  if (!key) throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (key.startsWith('sb_secret_')) {
    throw new Error('A Supabase secret key must never be used in the app');
  }
  const payload = key.split('.')[1];
  if (payload) {
    try {
      const role = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role;
      if (role === 'service_role') throw new Error('The service-role key must never be used in the app');
    } catch (error) {
      if (error instanceof Error && error.message.includes('service-role')) throw error;
      // Not a decodable JWT (e.g. a publishable key): nothing more to check.
    }
  }
}

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  assertClientSafeKey(key);
  client = createClient(url, key, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
