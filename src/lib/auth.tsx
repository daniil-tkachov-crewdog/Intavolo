import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { hasUnsynced, startSync, stopSync, syncNow } from './sync';

export type Provider = 'email' | 'google' | 'apple';

interface Auth {
  session: Session | null;
  ready: boolean;
  provider: Provider;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  /** Pushes pending progress first; returns false (and stays signed in) if some is still unsynced and force is not set. */
  signOut: (force?: boolean) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<Auth | null>(null);

const check = <T,>({ error }: { error: T | null }) => {
  if (error) throw error;
};

/** Thrown when the user dismisses a native sign-in sheet; callers should ignore it. */
export class Cancelled extends Error {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (uid) startSync(uid);
  }, [uid]);

  const value = useMemo<Auth>(() => {
    const localSignOut = async () => {
      await supabase.auth.signOut({ scope: 'local' });
      stopSync();
    };
    return {
      session,
      ready,
      provider: (session?.user.app_metadata.provider as Provider) ?? 'email',
      signInEmail: async (email, password) => check(await supabase.auth.signInWithPassword({ email, password })),
      signUpEmail: async (email, password) => check(await supabase.auth.signUp({ email, password })),
      signInGoogle: async () => {
        // Browser OAuth via Supabase (PKCE): only a Google Web client is needed.
        const redirectTo = Linking.createURL('auth');
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
        if (error) throw error;
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type !== 'success') throw new Cancelled();
        const { queryParams } = Linking.parse(res.url);
        if (queryParams?.error_description) throw new Error(String(queryParams.error_description));
        if (typeof queryParams?.code !== 'string') throw new Error('Google sign-in did not complete.');
        check(await supabase.auth.exchangeCodeForSession(queryParams.code));
      },
      signInApple: async () => {
        let cred: AppleAuthentication.AppleAuthenticationCredential;
        try {
          cred = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
          });
        } catch (e) {
          if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Cancelled();
          throw e;
        }
        if (!cred.identityToken) throw new Error('Apple did not return an identity token.');
        check(await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken }));
      },
      changePassword: async (password) => check(await supabase.auth.updateUser({ password })),
      signOut: async (force) => {
        await syncNow();
        if (hasUnsynced() && !force) return false;
        await localSignOut();
        return true;
      },
      deleteAccount: async () => {
        check(await supabase.rpc('delete_account'));
        await localSignOut();
      },
    };
  }, [session, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAuth outside AuthProvider');
  return a;
}
