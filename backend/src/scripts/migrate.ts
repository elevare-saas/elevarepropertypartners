/* create or update the database tables (safe to run again):  npm run db:migrate */
import {closeDb, migrate} from '../db/pg.js';

try {
  await migrate();
  console.log('Database tables are up to date.');
} catch (e) {
  console.error('Migration failed:', (e as Error).message || (e as {code?: string}).code || e);
  process.exitCode = 1;
} finally {
  await closeDb();
}
