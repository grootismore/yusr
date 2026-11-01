export type AuthErrorKey =
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.cannotCreate'
  | 'auth.errors.passwordShort'
  | 'auth.errors.tooMany'
  | 'auth.errors.network'
  | 'auth.errors.generic';

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

/** Map a Supabase auth error to a translation key. Never surfaces server text to the user. */
export function authErrorKey(error: AuthErrorLike): AuthErrorKey {
  if (error.code === 'invalid_credentials') return 'auth.errors.invalidCredentials';
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return 'auth.errors.cannotCreate';
  }
  if (error.code === 'weak_password') return 'auth.errors.passwordShort';
  if (error.status === 429 || error.code === 'over_request_rate_limit') return 'auth.errors.tooMany';
  if (error.name === 'AuthRetryableFetchError' || /network request failed/i.test(error.message ?? '')) {
    return 'auth.errors.network';
  }
  return 'auth.errors.generic';
}

export const MIN_PASSWORD_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string): boolean => EMAIL.test(value.trim());
