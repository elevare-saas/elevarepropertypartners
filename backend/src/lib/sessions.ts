/* Random token in a signed httpOnly cookie; only its SHA-256 is stored ("sessions" table). */
import type {CookieOptions, Request, Response} from 'express';
import {createHash, randomBytes} from 'node:crypto';
import {env} from '../config/env.js';
import {one, query} from '../db/pg.js';
import {adminSelect, toUser, type AdminWithRoles, type User} from './roles.js';

const {cookieName, ttlDays, cookieDomain, cookieSecure, cookieSameSite} = env.session;
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  signed: true,
  sameSite: cookieSameSite,
  secure: cookieSecure,
  domain: cookieDomain,
  path: '/'
});

/* undefined if missing or tampered with */
export const sessionToken = (req: Request): string | undefined => {
  const t = req.signedCookies?.[cookieName];
  return typeof t === 'string' && t ? t : undefined;
};

export async function startSession(res: Response, adminId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlDays * 864e5);
  await query('insert into sessions (token_hash, admin_id, expires_at) values ($1, $2, $3)', [
    hashToken(token),
    adminId,
    expiresAt
  ]);
  /* expired sessions are cleared now and then, on sign-in (no background job needed) */
  if (Math.random() < 0.1) await query('delete from sessions where expires_at < now()').catch(() => {});
  res.cookie(cookieName, token, {...cookieOptions(), expires: expiresAt});
  return expiresAt;
}

export async function endSession(req: Request, res: Response) {
  const t = sessionToken(req);
  if (t) await query('delete from sessions where token_hash = $1', [hashToken(t)]);
  const {signed: _signed, ...clear} = cookieOptions();
  res.clearCookie(cookieName, clear);
}

export const endAllSessions = (adminId: string) => query('delete from sessions where admin_id = $1', [adminId]);

/* the active admin behind a token whose session hasn't expired, with their roles as they are right now */
export async function sessionForToken(token: string): Promise<{user: User; expiresAt: Date} | undefined> {
  const a = await one<AdminWithRoles & {expiresAt: Date}>(
    `${adminSelect(', s.expires_at as "expiresAt"')}
       join sessions s on s.admin_id = a.id
      where s.token_hash = $1 and s.expires_at > now()
      group by a.id, s.expires_at`,
    [hashToken(token)]
  );
  return a && a.active ? {user: toUser(a), expiresAt: a.expiresAt} : undefined;
}
