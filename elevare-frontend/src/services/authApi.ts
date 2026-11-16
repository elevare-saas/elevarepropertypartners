/* the token is an httpOnly cookie the browser sends automatically */
import {request} from '@/lib/http';
import {readSession, saveSession, type StoredSession} from '@/lib/session';
import type {Credentials} from '@/types/admin';

export const authApi = {
  /* answers the account (never the password) and its expiry, and sets the cookie */
  login: (credentials: Credentials) => request<StoredSession>('/auth/login', {body: credentials, expect401: true}),

  /* 401 ApiError when there is no valid session */
  me: (signal?: AbortSignal) => request<StoredSession>('/auth/me', {signal, expect401: true}),

  logout: () => request<{ok: true}>('/auth/logout', {method: 'POST', expect401: true}),

  /* signs out other devices; this one gets a fresh session, so its stored expiry moves too */
  changePassword: async (current: string, next: string) => {
    const r = await request<{ok: true; expiresAt: string}>('/auth/password', {body: {current, next}});
    const session = readSession();
    if (session) saveSession({...session, expiresAt: r.expiresAt});
    return r;
  }
};
