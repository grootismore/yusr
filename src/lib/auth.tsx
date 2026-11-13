import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { PREVIEW, getSupabase } from './supabase';

export type AuthErrorKey = 'invalid' | 'exists' | 'weak' | 'network' | 'generic';
interface AuthResult { error?: AuthErrorKey; needsEmailConfirmation?: boolean }
interface AuthValue {
  signedIn: boolean; loading: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signInWithApple(): Promise<AuthResult>;
  /** Email a one-tap sign-in link (how a trusted person signs in without a password). */
  signInWithLink(email: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);
export const useAuth = (): AuthValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
};

export function authErrorKey(error: { message?: string; status?: number; code?: string }): AuthErrorKey {
  const m = (error.message ?? '').toLowerCase();
  if (error.code === 'user_already_exists' || m.includes('already registered')) return 'exists';
  if (error.code === 'weak_password' || m.includes('password should be')) return 'weak';
  if (error.code === 'invalid_credentials' || m.includes('invalid login')) return 'invalid';
  if (m.includes('network') || m.includes('fetch') || error.status === 0) return 'network';
  return 'generic';
}

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
    async signOut() { await getSupabase().auth.signOut(); qc.clear(); },
  }), [session, loading, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
