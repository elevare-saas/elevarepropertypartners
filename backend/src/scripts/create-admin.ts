/* create or reset a Super Admin:  npm run create-admin -- someone@example.com "a-long-password" */
import {closeDb, connectDb, one, query} from '../db/pg.js';
import {hashPassword, passwordProblem} from '../lib/passwords.js';
import {endAllSessions} from '../lib/sessions.js';

const [rawEmail, password] = process.argv.slice(2);
try {
  if (!rawEmail || !password) throw new Error('Usage: npm run create-admin -- <email> <password>');
  const bad = passwordProblem(password);
  if (bad) throw new Error(bad);
  const email = rawEmail.trim().toLowerCase();

  await connectDb();
  /* xmax = 0 only for a freshly inserted row: tells "created" from "reset" */
  const r = await one<{id: string; created: boolean}>(
    `insert into admins (email, name, password) values ($1, 'Super Admin', $2)
     on conflict (email) do update set password = excluded.password, active = true
     returning id, (xmax = 0) as created`,
    [email, await hashPassword(password)]
  );
  await query(
    'insert into admin_roles (admin_id, role_id) select $1, id from roles where system on conflict do nothing',
    [r!.id]
  );
  await endAllSessions(r!.id);
  console.log(
    r!.created ? `Created Super Admin ${email}.` : `Reset ${email}: now an active Super Admin with the new password.`
  );
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
