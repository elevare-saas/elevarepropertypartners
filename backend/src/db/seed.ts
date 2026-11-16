/* first start only: sample listings and the first Super Admin */
import {randomBytes} from 'node:crypto';
import {env} from '../config/env.js';
import {log} from '../lib/logger.js';
import {hashPassword} from '../lib/passwords.js';
import {col, type ListingDoc} from './mongo.js';
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

/* first start only: the "listings" counter exists from then on, so deleting every listing doesn't bring the samples back */
export async function seedListings() {
  if (await col.counters().findOne({_id: 'listings'})) return;
  const now = new Date();
  const docs: ListingDoc[] = (seed as SeedListing[]).map((l, i) => ({
    _id: l.id,
    seq: i + 1,
    mode: l.mode as ListingDoc['mode'],
    name: l.name,
    area: l.area,
    type: l.type,
    beds: l.beds,
    sqm: l.sqm,
    price: l.price,
    own: l.own ?? null,
    rent: l.rent ?? null,
    am: l.am,
    ex: l.ex,
    hue: l.hue,
    line: l.line,
    photo: l.photo,
    published: true,
    createdAt: now,
    updatedAt: now,
    updatedBy: 'seed'
  }));
  const existing = await col
    .listings()
    .find({}, {projection: {seq: 1}})
    .sort({seq: -1})
    .limit(1)
    .next();
  if (!existing) {
    await col.listings().insertMany(docs);
    log.info(`Seeded ${docs.length} sample listings.`);
  }
  await col.counters().updateOne({_id: 'listings'}, {$max: {seq: existing?.seq ?? docs.length}}, {upsert: true});
}

export async function ensureFirstAdmin() {
  if ((await col.admins().estimatedDocumentCount()) > 0) {
    if (!(await col.admins().findOne({lastLoginAt: {$ne: null}}, {projection: {_id: 1}})))
      log.warn('No admin has signed in yet. Lost the password? npm run create-admin -- <email> "<new-password>"');
    return;
  }
  const generated = !env.admin.password;
  const password = env.admin.password || randomBytes(9).toString('base64url');
  await col.admins().insertOne({
    email: env.admin.email,
    name: 'Super Admin',
    role: 'super_admin',
    password: await hashPassword(password),
    active: true,
    createdAt: new Date(),
    lastLoginAt: null
  });
  log.warn(
    `Created the first Super Admin: ${env.admin.email}` +
      (generated
        ? `. Temporary password (shown once): ${password}  Sign in and change it under "Account management".`
        : '')
  );
}
