/* Sign-in check against the "admins" table: email → password → active.
   Every failure costs the same bcrypt time, so the form can't reveal which emails exist. */
import {createHash, timingSafeEqual} from 'node:crypto';
import {checkPassword, hashPassword} from '../lib/passwords.js';
import {loadUser, type User} from '../lib/roles.js';
import {one, query, type AdminRow} from '../db/pg.js';

const DUMMY_HASH = hashPassword('timing-equaliser-not-a-real-password');
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const sha256 = (s: string) => createHash('sha256').update(s).digest();

/* '' for non-strings, e.g. {"$ne": ""} sent to probe the database */
export const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export type VerifyResult =
  {ok: true; user: User} | {ok: false; reason: 'unknown_email' | 'wrong_password' | 'disabled' | 'invalid_account'};

/* emails are stored lower-case (the table enforces it) */
const findAdmin = (email: string) =>
  one<Pick<AdminRow, 'id' | 'password' | 'active'>>('select id, password, active from admins where email = $1', [
    email
  ]);

/* bcrypt hash, or a plain-text password inserted by hand: matched once, then replaced by a hash */
async function passwordMatches(admin: Pick<AdminRow, 'id' | 'password'>, password: string) {
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

  /* an account without roles can still sign in: it sees only Account management */
  await query('update admins set last_login_at = now() where id = $1', [admin.id]);
  const user = await loadUser(admin.id);
  return user ? {ok: true, user} : {ok: false, reason: 'invalid_account'};
}
