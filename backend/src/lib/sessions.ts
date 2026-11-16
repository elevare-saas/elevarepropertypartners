/* Random token in a signed httpOnly cookie; only its SHA-256 is stored ("sessions", TTL index). */
import type {CookieOptions, Request, Response} from 'express';
import {createHash, randomBytes} from 'node:crypto';
import {ObjectId} from 'mongodb';
import {env} from '../config/env.js';
import {col} from '../db/mongo.js';
import {isRole, toUser, type User} from './roles.js';

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
  await col.sessions().insertOne({_id: hashToken(token), adminId: new ObjectId(adminId), expiresAt});
  res.cookie(cookieName, token, {...cookieOptions(), expires: expiresAt});
  return expiresAt;
}

export async function endSession(req: Request, res: Response) {
  const t = sessionToken(req);
  if (t) await col.sessions().deleteOne({_id: hashToken(t)});
  const {signed: _signed, ...clear} = cookieOptions();
  res.clearCookie(cookieName, clear);
}

export const endAllSessions = (adminId: string) => col.sessions().deleteMany({adminId: new ObjectId(adminId)});

/* the date check covers the minute before the TTL index removes an expired session */
export async function sessionForToken(token: string): Promise<{user: User; expiresAt: Date} | undefined> {
  const s = await col.sessions().findOne({_id: hashToken(token), expiresAt: {$gt: new Date()}});
  if (!s) return undefined;
  const a = await col.admins().findOne({_id: s.adminId}, {projection: {password: 0}});
  return a && a.active !== false && isRole(a.role) ? {user: toUser(a), expiresAt: s.expiresAt} : undefined;
}
