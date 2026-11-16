/* MongoDB connection, collections and indexes */
import {MongoClient, ObjectId, type Db, type WithId} from 'mongodb';
import {env} from '../config/env.js';
import {log} from '../lib/logger.js';
import type {Role} from '../lib/roles.js';

export interface AdminFields {
  email: string; // stored lower-case, unique
  role: Role;
  password: string; // bcrypt hash, never the password itself
  name?: string;
  active?: boolean; // missing = active
  createdAt?: Date;
  lastLoginAt?: Date | null;
}
export type AdminDoc = WithId<AdminFields>;
export interface SessionDoc {
  _id: string; // SHA-256 of the cookie token
  adminId: ObjectId;
  expiresAt: Date; // TTL index: MongoDB deletes the session once this passes
}
export interface ListingDoc {
  _id: string; // the listing id the website uses, e.g. "R1" or "3FA9C2D1"
  seq: number; // display order on the website
  mode: 'rent' | 'buy';
  name: string;
  area: string;
  type: string;
  beds: number;
  sqm: number;
  price: number;
  own: string | null;
  rent: number | null;
  am: string[];
  ex: string[];
  hue: number;
  line: string;
  photo: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}
export type LeadDoc = Record<string, unknown> & {_id?: ObjectId; status: string; receivedAt: Date};

let client: MongoClient | null = null;
let database: Db | null = null;

export function db(): Db {
  if (!database) throw new Error('MongoDB is not connected.');
  return database;
}
export const col = {
  admins: () => db().collection<AdminFields>('admins'),
  sessions: () => db().collection<SessionDoc>('sessions'),
  listings: () => db().collection<ListingDoc>('listings'),
  counters: () => db().collection<{_id: string; seq: number}>('counters'),
  leads: () => db().collection<LeadDoc>('leads')
};

/* a serverless function only has seconds to answer, a server can wait for MongoDB to start */
const RETRIES = process.env.VERCEL ? 2 : 5;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/* retries so the API can start alongside MongoDB (docker compose, service restart) */
export async function connectMongo() {
  for (let attempt = 1; ; attempt++) {
    try {
      client = new MongoClient(env.mongo.uri, {
        appName: 'elevare-api',
        serverSelectionTimeoutMS: 5_000,
        maxPoolSize: env.mongo.poolMax
      });
      await client.connect();
      database = client.db(env.mongo.db);
      await database.command({ping: 1});
      break;
    } catch (e) {
      await client?.close().catch(() => {});
      if (attempt === RETRIES)
        throw new Error(`${(e as Error).message}. Is MongoDB running at ${env.mongo.uri}?`, {cause: e});
      log.warn(`MongoDB not reachable (attempt ${attempt}/${RETRIES}), retrying in ${attempt * 2}s…`);
      await wait(attempt * 2_000);
    }
  }
  await ensureIndexes();
  log.info(`MongoDB connected: database "${env.mongo.db}"`);
}

/* an index that existing data breaks (e.g. duplicate emails) is reported, not fatal */
async function ensureIndexes() {
  const indexes = [
    () => col.admins().createIndex({email: 1}, {unique: true}),
    () => col.sessions().createIndex({adminId: 1}),
    () => col.sessions().createIndex({expiresAt: 1}, {expireAfterSeconds: 0}),
    () => col.listings().createIndex({published: 1, mode: 1, seq: 1}),
    () => col.listings().createIndex({updatedAt: -1}),
    () => col.leads().createIndex({receivedAt: -1}),
    () => col.leads().createIndex({ref: 1}),
    () => col.leads().createIndex({status: 1, receivedAt: -1})
  ];
  for (const create of indexes) await create().catch(e => log.warn(`Index not created: ${(e as Error).message}`));
}

/* listing display order */
export async function nextSeq(name: string) {
  const r = await col
    .counters()
    .findOneAndUpdate({_id: name}, {$inc: {seq: 1}}, {upsert: true, returnDocument: 'after'});
  return r!.seq;
}

export const isDuplicateKey = (e: unknown) => (e as {code?: number})?.code === 11000;

export const toObjectId = (id: unknown) => {
  const s = String(id ?? '');
  return /^[0-9a-f]{24}$/i.test(s) ? new ObjectId(s) : null;
};

export async function pingMongo(): Promise<'up' | 'down'> {
  try {
    await db().command({ping: 1});
    return 'up';
  } catch {
    return 'down';
  }
}

export async function closeMongo() {
  await client?.close();
}
