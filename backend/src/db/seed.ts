/* first start only: sample listings and the first Super Admin */
import {randomBytes} from 'node:crypto';
import {env} from '../config/env.js';
import {log} from '../lib/logger.js';
import {hashPassword} from '../lib/passwords.js';
import {one, pool, query} from './pg.js';
import seed from './seed-listings.json' with {type: 'json'};

interface SeedListing {
  id: string;
  mode: string;
  name: string;
  area: string;
  type: string;
  beds: number;
  sqm: number;
  price: number;
  own?: string;
  rent?: number;
  am: string[];
  ex: string[];
  hue: number;
  line: string;
  photo: string | null;
}

/* first start only: once app_meta has "listings_seeded", deleting every listing doesn't bring the samples back */
export async function seedListings() {
  if (await one(`select 1 from app_meta where key = 'listings_seeded'`)) return;
  const client = await pool.connect();
  try {
    await client.query('begin');
    const {rows} = await client.query<{n: string}>('select count(*) n from listings');
    if (Number(rows[0].n) === 0) {
      for (const l of seed as SeedListing[])
        await client.query(
          `insert into listings (id, mode, name, area, type, beds, sqm, price, own, rent, am, ex, hue, line, photo,
                                 published, updated_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, 'seed')`,
          [
            l.id,
            l.mode,
            l.name,
            l.area,
            l.type,
            l.beds,
            l.sqm,
            l.price,
            l.own ?? null,
            l.rent ?? null,
            l.am,
            l.ex,
            l.hue,
            l.line,
            l.photo
          ]
        );
      log.info(`Seeded ${(seed as SeedListing[]).length} sample listings.`);
    }
    await client.query(
      `insert into app_meta (key, value) values ('listings_seeded', now()::text) on conflict do nothing`
    );
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function ensureFirstAdmin() {
  if (await one('select 1 from admins limit 1')) {
    if (!(await one('select 1 from admins where last_login_at is not null limit 1')))
      log.warn('No admin has signed in yet. Lost the password? npm run create-admin -- <email> "<new-password>"');
    return;
  }
  const generated = !env.admin.password;
  const password = env.admin.password || randomBytes(9).toString('base64url');
  const row = await one<{id: string}>(
    `insert into admins (email, name, password) values ($1, 'Super Admin', $2)
     on conflict (email) do update set active = true returning id`,
    [env.admin.email, await hashPassword(password)]
  );
  await query(
    'insert into admin_roles (admin_id, role_id) select $1, id from roles where system on conflict do nothing',
    [row!.id]
  );
  log.warn(
    `Created the first Super Admin: ${env.admin.email}` +
      (generated
        ? `. Temporary password (shown once): ${password}  Sign in and change it under "Account management".`
        : '')
  );
}
