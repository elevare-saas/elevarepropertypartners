/* Sign-in check against the "admins" collection: email → password → active + role.
   Every failure costs the same bcrypt time, so the form can't reveal which emails exist. */
import {createHash, timingSafeEqual} from 'node:crypto';
import {checkPassword, hashPassword} from '../lib/passwords.js';
import {isRole, toUser, type User} from '../lib/roles.js';
import {col, type AdminDoc} from '../db/mongo.js';

const DUMMY_HASH = hashPassword('timing-equaliser-not-a-real-password');
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const sha256 = (s: string) => createHash('sha256').update(s).digest();

/* '' for non-strings, e.g. {"$ne": ""} sent to probe the database */
export const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export type VerifyResult =
  {ok: true; user: User} | {ok: false; reason: 'unknown_email' | 'wrong_password' | 'disabled' | 'invalid_account'};

/* exact match uses the index; the case-insensitive retry covers emails entered by hand with capitals */
const findAdmin = async (email: string) =>
  (await col.admins().findOne({email})) ??
  (await col.admins().findOne({email}, {collation: {locale: 'en', strength: 2}}));

/* bcrypt hash, or a plain-text password inserted by hand: matched once, then replaced by a hash */
async function passwordMatches(admin: AdminDoc, password: string) {
  if (BCRYPT.test(admin.password)) return checkPassword(password, admin.password);
  await checkPassword(password, await DUMMY_HASH);
  if (!timingSafeEqual(sha256(password), sha256(admin.password))) return false;
  await col.admins().updateOne({_id: admin._id}, {$set: {password: await hashPassword(password)}});
  return true;
}

export async function verifyCredentials(rawEmail: string, password: string): Promise<VerifyResult> {
  const admin = await findAdmin(normalizeEmail(rawEmail));
  if (!admin || typeof admin.password !== 'string' || !admin.password) {
    await checkPassword(password, await DUMMY_HASH);
    return {ok: false, reason: admin ? 'invalid_account' : 'unknown_email'};
  }
  if (!(await passwordMatches(admin, password))) return {ok: false, reason: 'wrong_password'};
  if (admin.active === false) return {ok: false, reason: 'disabled'};
  if (!isRole(admin.role)) return {ok: false, reason: 'invalid_account'};

  const updated = await col
    .admins()
    .findOneAndUpdate(
      {_id: admin._id},
      {$set: {email: admin.email.toLowerCase(), lastLoginAt: new Date()}},
      {returnDocument: 'after', projection: {password: 0}}
    );
  return {ok: true, user: toUser(updated ?? admin)};
}
