/* Sign-in check against the "admins" table: email → password → active + role.
   Every failure costs the same bcrypt time, so the form can't reveal which emails exist. */
import {createHash, timingSafeEqual} from 'node:crypto';
import {checkPassword, hashPassword} from '../lib/passwords.js';
import {isRole, toUser, type User} from '../lib/roles.js';
import {ADMIN_COLS, one, query, type AdminRow} from '../db/pg.js';

const DUMMY_HASH = hashPassword('timing-equaliser-not-a-real-password');
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const sha256 = (s: string) => createHash('sha256').update(s).digest();

/* '' for non-strings, e.g. {"$ne": ""} sent to probe the database */
export const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export type VerifyResult =
  {ok: true; user: User} | {ok: false; reason: 'unknown_email' | 'wrong_password' | 'disabled' | 'invalid_account'};

/* emails are stored lower-case (the table enforces it) */
const findAdmin = (email: string) =>
  one<AdminRow>(`select ${ADMIN_COLS}, password from admins where email = $1`, [email]);

/* bcrypt hash, or a plain-text password inserted by hand: matched once, then replaced by a hash */
async function passwordMatches(admin: AdminRow, password: string) {
  if (BCRYPT.test(admin.password)) return checkPassword(password, admin.password);
  await checkPassword(password, await DUMMY_HASH);
  if (!timingSafeEqual(sha256(password), sha256(admin.password))) return false;
  await query('update admins set password = $1 where id = $2', [await hashPassword(password), admin.id]);
  return true;
}

export async function verifyCredentials(rawEmail: string, password: string): Promise<VerifyResult> {
  const admin = await findAdmin(normalizeEmail(rawEmail));
  if (!admin || !admin.password) {
    await checkPassword(password, await DUMMY_HASH);
    return {ok: false, reason: admin ? 'invalid_account' : 'unknown_email'};
  }
  if (!(await passwordMatches(admin, password))) return {ok: false, reason: 'wrong_password'};
  if (!admin.active) return {ok: false, reason: 'disabled'};
  if (!isRole(admin.role)) return {ok: false, reason: 'invalid_account'};

  const updated = await one<Omit<AdminRow, 'password'>>(
    `update admins set last_login_at = now() where id = $1 returning ${ADMIN_COLS}`,
    [admin.id]
  );
  return {ok: true, user: toUser(updated ?? admin)};
}
