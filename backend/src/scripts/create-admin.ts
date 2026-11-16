/* create or reset a Super Admin:  npm run create-admin -- someone@example.com "a-long-password" */
import {closeMongo, col, connectMongo} from '../db/mongo.js';
import {hashPassword, passwordProblem} from '../lib/passwords.js';
import {endAllSessions} from '../lib/sessions.js';

const [rawEmail, password] = process.argv.slice(2);
try {
  if (!rawEmail || !password) throw new Error('Usage: npm run create-admin -- <email> <password>');
  const bad = passwordProblem(password);
  if (bad) throw new Error(bad);
  const email = rawEmail.trim().toLowerCase();

  await connectMongo();
  const r = await col.admins().findOneAndUpdate(
    {email},
    {
      $set: {password: await hashPassword(password), role: 'super_admin', active: true},
      $setOnInsert: {name: 'Super Admin', createdAt: new Date(), lastLoginAt: null}
    },
    {upsert: true, returnDocument: 'after', includeResultMetadata: true}
  );
  await endAllSessions(r.value!._id.toHexString());
  console.log(
    r.lastErrorObject?.updatedExisting
      ? `Reset ${email}: now an active Super Admin with the new password.`
      : `Created Super Admin ${email}.`
  );
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await closeMongo();
}
