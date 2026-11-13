export type AuthErrorKey = 'invalid' | 'exists' | 'weak' | 'network' | 'unconfirmed' | 'rate' | 'generic';

/** Turn a Supabase auth error into one of our own keys, so every screen can say something specific and kind. */
export function authErrorKey(error: { message?: string; status?: number; code?: string }): AuthErrorKey {
  const m = (error.message ?? '').toLowerCase();
  const c = error.code ?? '';
  if (c === 'user_already_exists' || m.includes('already registered')) return 'exists';
  if (c === 'weak_password' || m.includes('password should be')) return 'weak';
  if (c === 'email_not_confirmed' || m.includes('email not confirmed')) return 'unconfirmed';
  if (c === 'invalid_credentials' || m.includes('invalid login')) return 'invalid';
  if (c === 'over_request_rate_limit' || c === 'over_email_send_rate_limit' || error.status === 429 || m.includes('rate limit') || m.includes('too many')) return 'rate';
  if (m.includes('network') || m.includes('fetch') || error.status === 0) return 'network';
  return 'generic';
}
