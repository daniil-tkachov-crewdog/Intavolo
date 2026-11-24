import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { hasUnsynced, startSync, stopSync, syncNow } from './sync';
import * as db from './db';

const GOOGLE_IOS_CLIENT_ID = '907309564443-n1fp9jvrm35ub49jqm6tmr5ja8poebgn.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '907309564443-ga3u8ll3pli9vq0l69aeq02883ukrm18.apps.googleusercontent.com';

export type Provider = 'email' | 'google' | 'apple';

interface Auth {
  session: Session | null;
  ready: boolean;
  /** Using the app without an account; progress stays on this phone until they sign up or log in. */
  guest: boolean;
  continueAsGuest: () => void;
  provider: Provider;
  signInEmail: (email: string, password: string) => Promise<void>;
  /** Returns true when the account still needs email confirmation (no session yet). */
  signUpEmail: (email: string, password: string) => Promise<boolean>;
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
  const [guestFlag, setGuestFlag] = useState(() => db.getSetting('guest') === '1');

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
    if (!uid) return;
    // Guest progress (if any) is adopted by the account in startSync; after a later sign-out they land on login.
    db.deleteSetting('guest');
    setGuestFlag(false);
    startSync(uid);
  }, [uid]);

  const value = useMemo<Auth>(() => {
    const localSignOut = async () => {
      await supabase.auth.signOut({ scope: 'local' });
      stopSync();
    };
    return {
      session,
      ready,
      guest: !session && guestFlag,
      continueAsGuest: () => {
        db.setSetting('guest', '1');
        setGuestFlag(true);
      },
      provider: (session?.user.app_metadata.provider as Provider) ?? 'email',
      signInEmail: async (email, password) => check(await supabase.auth.signInWithPassword({ email, password })),
      signUpEmail: async (email, password) => {
        const res = await supabase.auth.signUp({ email, password });
        check(res);
        return !res.data.session;
      },
      signInGoogle: async () => {
        if (Platform.OS === 'ios') {
          // Native Google sheet → ID token → Supabase. No browser, so the Supabase domain never shows.
          GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID, webClientId: GOOGLE_WEB_CLIENT_ID });
          let res;
          try {
            res = await GoogleSignin.signIn();
          } catch (e) {
            if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) throw new Cancelled();
            throw e;
          }
          if (!isSuccessResponse(res)) throw new Cancelled();
          const token = res.data.idToken;
          if (!token) throw new Error('Google did not return an ID token.');
          check(await supabase.auth.signInWithIdToken({ provider: 'google', token }));
          return;
        }
        // Android: browser OAuth via Supabase (implicit flow, as in Supabase's Expo guide): only a Google Web client is needed.
        // Fixed app-scheme URL (Expo Go's exp://… URL changes per network and isn't allow-listed).
        // iOS's auth session captures this scheme itself, so it works in Expo Go too.
        const redirectTo = 'intavolo://auth';
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
        if (error) throw error;
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type !== 'success') throw new Cancelled();
        // Tokens come back in the URL (#access_token=…&refresh_token=…). Plain string parsing on purpose.
        const param = (k: string) => {
          const m = res.url.match(new RegExp(`[?&#]${k}=([^&#]*)`));
          return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
        };
        const err = param('error_description');
        if (err) throw new Error(err);
        const access_token = param('access_token');
        const refresh_token = param('refresh_token');
        if (!access_token || !refresh_token) throw new Error('Google sign-in did not complete.');
        check(await supabase.auth.setSession({ access_token, refresh_token }));
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
        // Apple users confirm with Apple once more; the fresh code lets the server revoke the app's access to their Apple ID.
        let appleAuthorizationCode: string | undefined;
        const providers: (string | undefined)[] = session?.user.app_metadata.providers ?? [session?.user.app_metadata.provider];
        if (providers.includes('apple')) {
          try {
            const cred = await AppleAuthentication.signInAsync();
            appleAuthorizationCode = cred.authorizationCode ?? undefined;
          } catch (e) {
            if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Cancelled();
            throw e;
          }
          if (!appleAuthorizationCode) throw new Error('Apple did not confirm. Please try again.');
        }
        const { error } = await supabase.functions.invoke('delete-account', { body: { appleAuthorizationCode } });
        if (error) throw new Error('Could not delete account. Check your connection and try again.');
        await localSignOut();
      },
    };
  }, [session, ready, guestFlag]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAuth outside AuthProvider');
  return a;
}
