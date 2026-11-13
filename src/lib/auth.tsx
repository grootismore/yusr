import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { type AuthErrorKey, authErrorKey } from './authErrors';
import { PREVIEW, getSupabase } from './supabase';

export { authErrorKey, type AuthErrorKey };

interface AuthResult { error?: AuthErrorKey; needsEmailConfirmation?: boolean }
interface AuthValue {
  signedIn: boolean; loading: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signInWithApple(): Promise<AuthResult>;
  /** Email a one-tap sign-in link (how a trusted person signs in without a password). */
  signInWithLink(email: string): Promise<AuthResult>;
  /** Send the sign-up confirmation email again. */
  resendConfirmation(email: string): Promise<AuthResult>;
  /** Email a link to choose a new password. The link opens the website's reset page. */
  resetPassword(email: string): Promise<AuthResult>;
  /** Set a new password for the person who is signed in (after following a reset link). */
  updatePassword(password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);
export const useAuth = (): AuthValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!PREVIEW);
  const qc = useQueryClient();

  useEffect(() => {
    if (PREVIEW) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') qc.clear(); // never leave one person's data for the next
    });
    const appState = AppState.addEventListener('change', (s) => (s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
    supabase.auth.startAutoRefresh();
    return () => { sub.subscription.unsubscribe(); appState.remove(); supabase.auth.stopAutoRefresh(); };
  }, [qc]);

  const value = useMemo<AuthValue>(() => ({
    signedIn: PREVIEW ? process.env.EXPO_PUBLIC_PREVIEW_OUT !== '1' : !!session,
    loading,
    async signIn(email, password) {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      return error ? { error: authErrorKey(error) } : {};
    },
    async signUp(email, password) {
      const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
      if (error) return { error: authErrorKey(error) };
      return data.session ? {} : { needsEmailConfirmation: true };
    },
    async signInWithLink(email) {
      const { error } = await getSupabase().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: process.env.EXPO_PUBLIC_APP_URL || undefined } });
      return error ? { error: authErrorKey(error) } : {};
    },
    async signInWithApple() {
      if (Platform.OS !== 'ios') return { error: 'generic' };
      try {
        const AppleAuth = await import('expo-apple-authentication');
        const cred = await AppleAuth.signInAsync({ requestedScopes: [AppleAuth.AppleAuthenticationScope.EMAIL] });
        if (!cred.identityToken) return { error: 'generic' };
        const { error } = await getSupabase().auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
        return error ? { error: authErrorKey(error) } : {};
      } catch (e) {
        return (e as { code?: string }).code === 'ERR_REQUEST_CANCELED' ? {} : { error: 'generic' };
      }
    },
    async resendConfirmation(email) {
      const { error } = await getSupabase().auth.resend({ type: 'signup', email: email.trim() });
      return error ? { error: authErrorKey(error) } : {};
    },
    async resetPassword(email) {
      const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '');
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: base ? `${base}/reset-password` : undefined });
      return error ? { error: authErrorKey(error) } : {};
    },
    async updatePassword(password) {
      const { error } = await getSupabase().auth.updateUser({ password });
      return error ? { error: authErrorKey(error) } : {};
    },
    async signOut() { await getSupabase().auth.signOut(); qc.clear(); },
  }), [session, loading, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
