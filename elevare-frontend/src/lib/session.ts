/* The signed-in session as this browser remembers it (localStorage).
   The token itself stays in the httpOnly cookie, out of reach of page scripts; the server has the final say. */
import type {AdminUser} from '@/types/admin';

export interface StoredSession {
  user: AdminUser;
  expiresAt: string;
}

export const SESSION_KEY = 'elevare.admin.session';

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/* null when missing, malformed or expired */
export function readSession(): StoredSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as StoredSession | null;
    if (s?.user?.id && Date.parse(s.expiresAt) > Date.now()) return s;
  } catch {
    /* malformed: treated as signed out */
  }
  clearSession();
  return null;
}

export function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked (private mode): the cookie session still works for this page */
  }
}
