/* npm run vercel:db: after changing the database password or address in backend/.env, update the live site.
   1. tests DATABASE_URL from backend/.env (stops if the database rejects it, so a bad value never reaches Vercel)
   2. saves it in Vercel (production + preview), without printing it
   3. redeploys the current live version so it uses the new value, then checks /api/health */
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const ROOT = new URL('..', import.meta.url);
const SITE = 'https://elevarepropertypartners.vercel.app';
const fail = msg => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

const line = readFileSync(new URL('backend/.env', ROOT), 'utf8')
  .split(/\r?\n/)
  .filter(l => l.startsWith('DATABASE_URL='))
  .pop();
const url = line?.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
if (!url) fail('backend/.env has no DATABASE_URL line.');
let host;
try {
  host = new URL(url).hostname;
} catch {
  fail('DATABASE_URL in backend/.env is not a valid address (a password with @ : / # ? % breaks it: reset it).');
}
if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host))
  fail("DATABASE_URL uses Supabase's direct address. Use Connect → Transaction pooler (port 6543) instead.");

/* 1. does the database accept it? (uses the backend's own Postgres driver) */
console.log(`Testing the database at ${host}…`);
const pg = createRequire(new URL('backend/package.json', ROOT))('pg');
const client = new pg.Client({connectionString: url, ssl: {rejectUnauthorized: false}, connectionTimeoutMillis: 15000});
try {
  await client.connect();
  const {rows} = await client.query('select count(*)::int n from listings');
  console.log(`✓ Connected: ${rows[0].n} listings.`);
} catch (e) {
  fail(
    /password authentication failed/i.test(e.message)
      ? 'The database rejected the password in backend/.env. Check it matches Supabase (Project Settings → Database).'
      : `Could not use the database: ${e.message}`
  );
} finally {
  await client.end().catch(() => {});
}

/* 2. save it in Vercel; the value goes through stdin, never onto the screen or the command line */
/* the arguments are fixed words (no user input), so one command line is safe; Windows needs the shell for vercel.cmd */
const vercel = (args, input) => {
  const r = spawnSync(['vercel', ...args].join(' '), {cwd: ROOT, input, encoding: 'utf8', shell: true});
  return {ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`};
};
for (const target of ['production', 'preview']) {
  const r = vercel(['env', 'add', 'DATABASE_URL', target, '--force'], url);
  if (!r.ok) fail(`Vercel didn't save DATABASE_URL for ${target}:\n${r.out.slice(-600)}`);
  console.log(`✓ Saved in Vercel (${target}).`);
}

/* 3. rebuild the live version with the new value */
console.log('Redeploying the live site (about 1–2 minutes)…');
const r = vercel(['redeploy', SITE.replace('https://', ''), '--target', 'production']);
if (!r.ok) fail(`Redeploy failed:\n${r.out.slice(-800)}`);
const health = await fetch(`${SITE}/api/health`).then(
  res => res.json(),
  () => null
);
if (health?.database === 'up') console.log(`✓ Live site connected to the database: ${SITE}`);
else fail(`The redeploy finished but ${SITE}/api/health says ${JSON.stringify(health)}. Check the Vercel logs.`);
