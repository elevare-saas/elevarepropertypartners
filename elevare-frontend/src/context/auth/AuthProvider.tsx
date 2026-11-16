/* Admin session.
   1. start from the session stored in this browser: none → signed out (guards send you to sign-in)
   2. confirm it with the server in the background: a 401 clears it
   It also ends when it expires, when any request gets a 401, and when another tab signs out. */
import {useCallback, useEffect, useMemo, useReducer, type ReactNode} from 'react';
import {ApiError, isAbort, onUnauthorized} from '@/lib/http';
import {clearSession, readSession, saveSession, SESSION_KEY} from '@/lib/session';
import {authApi} from '@/services/authApi';
import type {AdminUser, Credentials} from '@/types/admin';
import {AuthContext, type AuthStatus, type AuthValue} from './AuthContext';

interface State {
  status: AuthStatus;
  user: AdminUser | null;
  notice: string;
}
type Action =
  | {type: 'signedIn'; user: AdminUser}
  | {type: 'signedOut'; notice: string}
  | {type: 'sessionEnded'}
  | {type: 'userUpdated'; user: AdminUser};

const MAX_TIMEOUT = 2 ** 31 - 1;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'signedIn':
      return {status: 'authenticated', user: action.user, notice: ''};
    case 'signedOut':
      return {status: 'unauthenticated', user: null, notice: action.notice};
    case 'sessionEnded':
      return state.status === 'authenticated'
        ? {status: 'unauthenticated', user: null, notice: 'Your session has ended. Please sign in again.'}
        : state;
    case 'userUpdated':
      return state.user?.id === action.user.id ? {...state, user: action.user} : state;
  }
}

const initialState = (): State => {
  const stored = readSession();
  return {status: stored ? 'authenticated' : 'unauthenticated', user: stored?.user ?? null, notice: ''};
};

export function AuthProvider({children}: {children: ReactNode}) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    let controller: AbortController | undefined;
    const end = () => {
      clearSession();
      dispatch({type: 'sessionEnded'});
    };

    const verify = () => {
      controller?.abort();
      if (!readSession()) return end();
      controller = new AbortController();
      authApi.me(controller.signal).then(
        session => {
          saveSession(session);
          dispatch({type: 'signedIn', user: session.user});
        },
        (e: unknown) => {
          /* only a 401 ends it; if the server is unreachable the stored session stays and requests show the error */
          if (!isAbort(e) && e instanceof ApiError && e.status === 401) end();
        }
      );
    };

    /* bfcache restores a snapshot: the user may have signed out since */
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) verify();
    };
    /* sign-in / sign-out in another tab */
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESSION_KEY && e.key !== null) return;
      const stored = readSession();
      if (stored) dispatch({type: 'signedIn', user: stored.user});
      else dispatch({type: 'signedOut', notice: 'You were signed out in another tab.'});
    };

    verify();
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);
    const unsubscribe = onUnauthorized(end);
    return () => {
      controller?.abort();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
      unsubscribe();
    };
  }, []);

  /* end the session when it expires (re-read on each tick: a password change extends it) */
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const stored = readSession();
      if (!stored) return dispatch({type: 'sessionEnded'});
      timer = setTimeout(schedule, Math.min(Date.parse(stored.expiresAt) - Date.now() + 1000, MAX_TIMEOUT));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [state.status]);

  const login = useCallback(async (credentials: Credentials) => {
    const session = await authApi.login({email: credentials.email.trim(), password: credentials.password});
    saveSession(session);
    dispatch({type: 'signedIn', user: session.user});
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    /* sign out locally even if the server is unreachable; the cookie expires anyway */
    await authApi.logout().catch(() => {});
    clearSession();
    dispatch({type: 'signedOut', notice: 'You are signed out.'});
  }, []);

  const updateUser = useCallback((user: AdminUser) => {
    const stored = readSession();
    if (stored?.user.id === user.id) saveSession({...stored, user});
    dispatch({type: 'userUpdated', user});
  }, []);

  const value = useMemo<AuthValue>(() => ({...state, login, logout, updateUser}), [state, login, logout, updateUser]);
  return <AuthContext value={value}>{children}</AuthContext>;
}
