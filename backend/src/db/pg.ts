/* Postgres (Supabase): connection pool, row types, schema migration.
   Connect through Supabase's transaction pooler (port 6543): it works over IPv4, which Vercel and most hosts need. */
import pg from 'pg';
import {env} from '../config/env.js';
import {log} from '../lib/logger.js';
import type {Role} from '../lib/roles.js';

export interface AdminRow {
  id: string;
  email: string; // stored lower-case, unique
  role: Role;
  password: string; // bcrypt hash, never the password itself
  name: string;
  active: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
}
export interface ListingRow {
  id: string; // the listing id the website uses, e.g. "R1" or "3FA9C2D1"
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

/* bigint columns (prices) come back as numbers: every price fits easily in a JS number */
pg.types.setTypeParser(pg.types.builtins.INT8, v => Number(v));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(env.db.url);
export const pool = new pg.Pool({
  connectionString: env.db.url,
  max: env.db.poolMax,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 20_000,
  /* Supabase requires TLS; its certificate chain isn't in Node's default store */
  ssl: local ? undefined : {rejectUnauthorized: false},
  application_name: 'elevare-api'
});
pool.on('error', e => log.warn(`Postgres connection dropped: ${e.message}`));

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) {
  return pool.query<R>(text, values);
}
export async function one<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) {
  return (await pool.query<R>(text, values)).rows[0] as R | undefined;
}

export const isUniqueViolation = (e: unknown) => (e as {code?: string})?.code === '23505';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: unknown): id is string => typeof id === 'string' && UUID.test(id);

/* column lists with camelCase names, for SELECT … and RETURNING … */
export const ADMIN_COLS = `id, email, role, name, active, created_at as "createdAt", last_login_at as "lastLoginAt"`;
export const LISTING_COLS = `id, seq, mode, name, area, type, beds, sqm, price, own, rent, am, ex, hue, line, photo,
  published, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"`;

/* retries so the API can start alongside the database; a serverless function only has seconds */
const RETRIES = process.env.VERCEL ? 2 : 5;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
/* autoMigrate: a long-running server brings the tables up to date at start; serverless runs `npm run db:migrate` */
export async function connectDb({autoMigrate = false} = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('select 1');
      break;
    } catch (e) {
      if (attempt === RETRIES)
        throw new Error(`${(e as Error).message}. Check DATABASE_URL (Supabase transaction pooler).`, {cause: e});
      log.warn(`Database not reachable (attempt ${attempt}/${RETRIES}), retrying in ${attempt * 2}s…`);
      await wait(attempt * 2_000);
    }
  }
  if (autoMigrate) await migrate();
  const ready = await one<{ok: boolean}>(`select to_regclass('public.listings') is not null as ok`);
  if (!ready?.ok) throw new Error('The database has no tables yet. Run: npm run db:migrate');
  log.info('Database connected.');
}

export async function pingDb(): Promise<'up' | 'down'> {
  try {
    await pool.query('select 1');
    return 'up';
  } catch {
    return 'down';
  }
}
export const closeDb = () => pool.end();

/* idempotent: safe to run on every deploy. RLS is on with no policies, so Supabase's public API (anon / authenticated
   keys) can't read or change anything; this backend connects as the table owner, which RLS doesn't restrict. */
export const SCHEMA = `
create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  role text not null check (role in ('super_admin', 'marketing_manager', 'viewer')),
  password text not null,
  name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  token_hash text primary key,
  admin_id uuid not null references admins (id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists sessions_admin_id on sessions (admin_id);
create index if not exists sessions_expires_at on sessions (expires_at);

create sequence if not exists listings_seq;
create table if not exists listings (
  id text primary key,
  seq integer not null default nextval('listings_seq'),
  mode text not null check (mode in ('rent', 'buy')),
  name text not null,
  area text not null,
  type text not null,
  beds integer not null,
  sqm integer not null,
  price bigint not null,
  own text,
  rent bigint,
  am text[] not null default '{}',
  ex text[] not null default '{}',
  hue integer not null default 260,
  line text not null default '',
  photo text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);
create index if not exists listings_public on listings (published, mode, seq);
create index if not exists listings_updated on listings (updated_at desc);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  ref text,
  data jsonb not null default '{}',
  user_agent text,
  received_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by text
);
create index if not exists leads_received on leads (received_at desc);
create index if not exists leads_status on leads (status, received_at desc);
create index if not exists leads_ref on leads (ref);

create table if not exists app_meta (
  key text primary key,
  value text not null
);

alter table admins enable row level security;
alter table sessions enable row level security;
alter table listings enable row level security;
alter table leads enable row level security;
alter table app_meta enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on admins, sessions, listings, leads, app_meta from anon, authenticated;
    revoke all on sequence listings_seq from anon, authenticated;
  end if;
end $$;
`;

export async function migrate() {
  await pool.query(SCHEMA);
}
