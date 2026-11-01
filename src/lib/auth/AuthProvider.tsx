import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { authErrorKey, type AuthErrorKey } from './authErrors';

interface AuthResult {
  error?: AuthErrorKey;
  /** Sign-up succeeded but the user must confirm their email before a session exists. */
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    // Only refresh tokens while the app is in the foreground.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => {
      listener.subscription.unsubscribe();
      appState.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
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
      async signOut() {
        await getSupabase().auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
