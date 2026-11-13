import { Platform } from 'react-native';
import { getSupabase } from './supabase';

export type Recovery = 'ready' | 'expired' | 'none';

/**
 * The reset email opens the website with the recovery tokens in the address (#access_token=...&type=recovery).
 * Read them, start a short-lived session so the person can choose a new password, and clear the address bar.
 */
export async function recoverFromUrl(): Promise<Recovery> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'none';
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (params.get('error') || params.get('error_code')) return 'expired';
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !access_token || !refresh_token) return 'none';
  const { error } = await getSupabase().auth.setSession({ access_token, refresh_token });
  window.history.replaceState(null, '', window.location.pathname);
  return error ? 'expired' : 'ready';
}
