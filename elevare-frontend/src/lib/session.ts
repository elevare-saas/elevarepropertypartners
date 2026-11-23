/* The signed-in session as this browser remembers it (localStorage, shared by all tabs).
   The token itself stays in the httpOnly cookie, out of reach of page scripts; the server has the final say.

   Closing the whole browser signs out; closing a tab doesn't. localStorage alone would outlive the browser, so a
   small marker cookie without an expiry date (the browser deletes it when it closes, like the sign-in cookie) is
   kept next to it: no marker means the browser was closed, and the stored session is deleted. */
import type {AdminUser} from '@/types/admin';

export interface StoredSession {
  user: AdminUser;
  expiresAt: string;
}

export const SESSION_KEY = 'elevare.admin.session';
const MARKER = 'elevare_admin_open';

const secure = () => (location.protocol === 'https:' ? '; Secure' : '');
const hasMarker = () => document.cookie.split('; ').includes(`${MARKER}=1`);
const setMarker = () => (document.cookie = `${MARKER}=1; path=/; SameSite=Lax${secure()}`);
const removeMarker = () => (document.cookie = `${MARKER}=; path=/; max-age=0; SameSite=Lax${secure()}`);

export function clearSession() {
  removeMarker();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/* null when missing, malformed, expired, or left over from before the browser was closed */
export function readSession(): StoredSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as StoredSession | null;
    if (hasMarker() && s?.user?.id && Date.parse(s.expiresAt) > Date.now()) return s;
  } catch {
    /* malformed: treated as signed out */
  }
  clearSession();
  return null;
}

export function saveSession(session: StoredSession) {
  setMarker();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked (private mode): the cookie session still works for this page */
  }
}
